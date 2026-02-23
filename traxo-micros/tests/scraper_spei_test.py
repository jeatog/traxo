
import asyncio
import os
import pytest
from playwright.async_api import async_playwright
from app.scraper_spei import rastrear
from app.modelos.modelos_spei import RastreoPeticion, TransaccionNoEncontradaError

pytestmark = pytest.mark.asyncio

_URL_FORM = 'https://www.banxico.org.mx/cep/'


def _requerir_env(nombre: str) -> str:
    """Lee una variable de entorno; omite el test si no está definida."""
    valor = os.environ.get(nombre)
    if not valor:
        pytest.skip(f"Variable de entorno no configurada: {nombre}. Ver traxo-micros/.env.example")
    return valor


# Banxico limita la cadencia de peticiones por IP. Esta pausa entre pruebas
# garantiza que la segunda consulta no llegue demasiado pronto tras la primera.
@pytest.fixture(autouse=True)
async def pausa_entre_pruebas():
    yield
    await asyncio.sleep(10)


@pytest.fixture
async def pagina_y_codigos():
    """
    Proporciona una página precargada en el formulario de Banxico y el catálogo
    de códigos de banco, replicando el entorno de producción.
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(_URL_FORM, timeout=30000)

        fecha_api = await page.evaluate("document.getElementById('input_fecha').value")
        codigos = await page.evaluate(
            '''async (fecha) => {
                const resp = await fetch('/cep/instituciones.do?fecha=' + fecha);
                const data = await resp.json();
                return Object.fromEntries(
                    data.instituciones.map(([code, name]) => [name.trim(), code])
                );
            }''',
            fecha_api,
        )
        yield page, codigos
        await browser.close()


@pytest.fixture
def credenciales_prueba():
    """Datos de una transferencia real leídos desde variables de entorno."""
    return {
        "fecha":           _requerir_env("TRAXO_TEST_FECHA"),
        "claveRastreo":    _requerir_env("TRAXO_TEST_CLAVE_RASTREO"),
        "bancoEmisor":     _requerir_env("TRAXO_TEST_BANCO_EMISOR"),
        "bancoReceptor":   _requerir_env("TRAXO_TEST_BANCO_RECEPTOR"),
        "cuentaReceptora": _requerir_env("TRAXO_TEST_CUENTA_RECEPTORA"),
        "monto":           _requerir_env("TRAXO_TEST_MONTO"),
    }


async def test_rastreo_basico_exitoso(pagina_y_codigos, credenciales_prueba):
    """
    Prueba de integración (end-to-end) para el flujo de 'datosCompletos=false'.
    Depende del servicio en vivo de Banxico.
    """
    page, codigos = pagina_y_codigos
    peticion = RastreoPeticion(**credenciales_prueba, datosCompletos=False)

    resultado = await rastrear(peticion, page, codigos)

    assert resultado["tipoDatos"] == "Basico"
    assert resultado["clave"] == peticion.claveRastreo
    assert "Liquidado" in resultado["estado"]


async def test_transaccion_no_encontrada(pagina_y_codigos, credenciales_prueba):
    """
    Verifica que el scraper lanza TransaccionNoEncontradaError cuando
    Banxico no encuentra la operación (monto incorrecto a propósito).
    """
    page, codigos = pagina_y_codigos
    datos = {**credenciales_prueba, "monto": "0.01"}  # monto incorrecto → Banxico no encuentra la operación
    peticion = RastreoPeticion(**datos, datosCompletos=False)

    with pytest.raises(TransaccionNoEncontradaError) as exc_info:
        await rastrear(peticion, page, codigos)

    assert "no encontrada" in exc_info.value.args[0].lower()
