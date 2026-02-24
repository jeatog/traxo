
import asyncio
import logging
import os
import re
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()  # carga .env si existe (no sobreescribe vars ya seteadas en el entorno)
from fastapi import Depends, FastAPI, File, Header, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from playwright.async_api import async_playwright
from app.modelos.modelos_spei import (
    RastreoPeticion,
    RastreoRespuesta,
    TransaccionNoEncontradaError,
    ServicioBanxicoError,
)
from app.modelos.modelos_ocr import OcrRespuesta
from app.scraper_spei import rastrear
from app.ocr import inicializar_lector, extraer_texto, parsear_campos_spei, extraer_clave_con_vision

_CLAVE_INTERNA = os.environ.get("MICROS_API_KEY", "")


def verificar_clave_interna(x_internal_key: str = Header(default="")) -> None:
    """
    Valida que la petición proviene del backend autorizado.
    Si MICROS_API_KEY no está configurada en el entorno, la verificación se omite
    (útil en desarrollo local sin el stack completo).
    """
    if _CLAVE_INTERNA and x_internal_key != _CLAVE_INTERNA:
        raise HTTPException(status_code=401, detail="Clave interna inválida.")

logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] %(asctime)s - %(filename)s - %(lineno)d: %(message)s",
)
logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)

_URL_FORM = 'https://www.banxico.org.mx/cep/'
_POOL_SIZE = 3
# Recursos que no afectan el comportamiento del formulario y se pueden bloquear
# para reducir el tiempo de carga de la página.
_RECURSOS_BLOQUEABLES = re.compile(
    r'\.(ttf|woff|woff2|eot|ico|png|jpg|jpeg|gif|svg)(\?.*)?$', re.IGNORECASE
)


async def _crear_pagina(browser):
    """Crea una página nueva con recursos bloqueados y precargada en el formulario."""
    page = await browser.new_page()
    await page.route(_RECURSOS_BLOQUEABLES, lambda route: route.abort())
    await page.goto(_URL_FORM, timeout=30000)
    return page


async def _cargar_codigos_banco(browser) -> dict:
    """
    Carga el catálogo de instituciones de Banxico una sola vez al iniciar.
    La lista de bancos es esencialmente estática; no es necesario refrescarla
    por petición. Para forzar un refresco, reiniciar el servidor.
    """
    page = await _crear_pagina(browser)
    try:
        fecha_api = await page.evaluate("document.getElementById('input_fecha').value")
        return await page.evaluate(
            '''async (fecha) => {
                const resp = await fetch('/cep/instituciones.do?fecha=' + fecha);
                const data = await resp.json();
                return Object.fromEntries(
                    data.instituciones.map(([code, name]) => [name.trim(), code])
                );
            }''',
            fecha_api,
        )
    finally:
        await page.close()


async def _replenish_pool(page, pool, browser):
    """
    Navega la página de vuelta al formulario y la devuelve al pool.
    Si falla, crea una página de reemplazo. Corre siempre en background.
    """
    try:
        await page.goto(_URL_FORM, timeout=30000)
        await pool.put(page)
    except Exception as e:
        logger.warning(f"Error al reponer página en pool: {e}. Creando reemplazo...")
        await page.close()
        try:
            nueva = await _crear_pagina(browser)
            await pool.put(nueva)
        except Exception:
            logger.error("No se pudo crear página de reemplazo para el pool.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicializar EasyOCR en un hilo separado para no bloquear el event loop
    logger.info("Inicializando lector OCR...")
    app.state.ocr_reader = await asyncio.to_thread(inicializar_lector)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        app.state.browser = browser

        logger.info("Cargando catálogo de bancos desde Banxico...")
        app.state.codigos_banco = await _cargar_codigos_banco(browser)
        logger.info(f"Catálogo cargado: {len(app.state.codigos_banco)} instituciones.")

        logger.info(f"Inicializando pool de {_POOL_SIZE} páginas precargadas...")
        pool = asyncio.Queue()
        for _ in range(_POOL_SIZE):
            page = await _crear_pagina(browser)
            await pool.put(page)
        app.state.page_pool = pool
        logger.info("Pool listo. API disponible.")

        yield

        logger.info("Cerrando pool y browser...")
        while not pool.empty():
            try:
                page = pool.get_nowait()
                await page.close()
            except asyncio.QueueEmpty:
                break
        await browser.close()


app = FastAPI(
    title="API de Scraper para Banxico SPEI",
    description="Una API para realizar consultas de rastreo de transferencias SPEI en el portal de Banxico.",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.get(
    "/bancos",
    response_model=list[str],
    tags=["Catálogo"],
    dependencies=[Depends(verificar_clave_interna)],
    responses={401: {"description": "Clave interna inválida."}},
)
async def listar_bancos(request: Request) -> list[str]:
    """Retorna la lista ordenada de instituciones bancarias disponibles en Banxico."""
    codigos: dict = request.app.state.codigos_banco
    return sorted(codigos.keys())


@app.get("/health", tags=["Salud"])
async def health_check():
    """Verifica que el servidor está corriendo, el browser disponible y el pool con páginas."""
    browser_ok = hasattr(app.state, "browser") and app.state.browser.is_connected()
    if not browser_ok:
        return JSONResponse(status_code=503, content={"status": "degraded", "browser": False})
    pool_size = app.state.page_pool.qsize() if hasattr(app.state, "page_pool") else 0
    return {"status": "ok", "browser": True, "paginas_disponibles": pool_size}


@app.post(
    "/rastreo-spei",
    response_model=RastreoRespuesta,
    status_code=200,
    tags=["SPEI"],
    dependencies=[Depends(verificar_clave_interna)],
    responses={
        401: {"description": "Clave interna inválida."},
        404: {"description": "Transferencia no encontrada en Banxico."},
        422: {"description": "Datos de la petición inválidos."},
        429: {"description": "Límite de peticiones excedido."},
        503: {"description": "El portal de Banxico no está disponible."},
    },
)
@limiter.limit("15/minute")
async def realizar_rastreo_spei(peticion: RastreoPeticion, request: Request) -> RastreoRespuesta:
    """
    Realiza una consulta de rastreo de una transferencia SPEI en el portal de Banxico.
    - **fecha**: Fecha de la operación (dd/mm/yyyy).
    - **claveRastreo**: Clave de rastreo de la transferencia.
    - **bancoEmisor**: Nombre del banco emisor (ej. "BBVA MEXICO").
    - **bancoReceptor**: Nombre del banco receptor (ej. "BANAMEX").
    - **cuentaReceptora**: Número de cuenta, tarjeta o celular del beneficiario.
    - **monto**: Monto de la operación (ej. "767.00").
    - **datosCompletos**: `true` para descargar el XML con todos los detalles, `false` para la consulta básica.
    """
    page = await asyncio.wait_for(request.app.state.page_pool.get(), timeout=30)
    try:
        resultado_dict = await rastrear(
            peticion,
            page,
            request.app.state.codigos_banco,
        )
        return RastreoRespuesta(**resultado_dict)
    except TransaccionNoEncontradaError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ServicioBanxicoError as e:
        logger.error(f"Error de servicio externo: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Error inesperado en el endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Ocurrió un error interno inesperado.")
    finally:
        # La página se devuelve al pool en background — el response ya se mandó.
        asyncio.create_task(
            _replenish_pool(page, request.app.state.page_pool, request.app.state.browser)
        )


_CONTENT_TYPES_PERMITIDOS = {"image/jpeg", "image/png", "image/webp"}
_MAX_TAMANO_BYTES = 10 * 1024 * 1024  # 10 MB


@app.post(
    "/ocr/analizar",
    response_model=OcrRespuesta,
    tags=["OCR"],
    dependencies=[Depends(verificar_clave_interna)],
    responses={
        401: {"description": "Clave interna inválida."},
        413: {"description": "Imagen demasiado grande (máx 10 MB)."},
        422: {"description": "Tipo de archivo no soportado."},
        500: {"description": "Error interno al procesar la imagen."},
    },
)
async def analizar_comprobante(
    request: Request,
    imagen: UploadFile = File(...),
) -> OcrRespuesta:
    """
    Analiza un comprobante de transferencia bancaria con OCR y extrae los campos SPEI.
    Acepta imágenes JPG, PNG o WEBP de hasta 10 MB.
    Retorna los campos extraídos y la lista de campos no encontrados.
    """
    if imagen.content_type not in _CONTENT_TYPES_PERMITIDOS:
        raise HTTPException(status_code=422, detail="Solo se aceptan imágenes JPG, PNG o WEBP.")

    datos = await imagen.read()
    if len(datos) > _MAX_TAMANO_BYTES:
        raise HTTPException(status_code=413, detail="Imagen demasiado grande (máx 10 MB).")

    try:
        lector = request.app.state.ocr_reader
        bancos = list(request.app.state.codigos_banco.keys())
        lineas = await asyncio.to_thread(extraer_texto, datos, lector)
        campos, faltantes = parsear_campos_spei(lineas, bancos)

        # Claude Vision sobreescribe la clave de rastreo si ANTHROPIC_API_KEY está configurada.
        clave_vision = await asyncio.to_thread(
            extraer_clave_con_vision, datos, imagen.content_type or 'image/jpeg', campos.get('emisor')
        )
        if clave_vision:
            campos['claveRastreo'] = clave_vision
            faltantes = [c for c in campos if not campos[c]]

        return OcrRespuesta(campos=campos, faltantes=faltantes)
    except Exception as e:
        logger.error(f"Error al procesar imagen OCR: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al procesar la imagen.")
