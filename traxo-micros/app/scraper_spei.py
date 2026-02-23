
import logging
import pandas as pd
import io
from playwright.async_api import Error as PlaywrightError
from bs4 import BeautifulSoup
from app.modelos.modelos_spei import (
    RastreoPeticion,
    TransaccionNoEncontradaError,
    ServicioBanxicoError,
)

logger = logging.getLogger(__name__)


async def rastrear(peticion: RastreoPeticion, page, codigos_banco: dict) -> dict:
    """
    Realiza el scraping sobre una página ya precargada en la URL del formulario.
    El ciclo de vida de `page` es responsabilidad del llamador (pool en producción,
    fixture en tests).
    """
    logger.info(f"Iniciando rastreo para clave: {peticion.claveRastreo}")
    try:
        # El campo usa jQuery UI datepicker — su API es la única forma de actualizar
        # correctamente tanto el valor visible como el estado interno del widget.
        await page.evaluate(
            '''(fecha) => {
                const parts = fecha.split('/');
                const dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
                $('#input_fecha').datepicker('setDate', dateObj);
            }''',
            peticion.fecha,
        )

        emisor_code = codigos_banco.get(peticion.bancoEmisor)
        receptor_code = codigos_banco.get(peticion.bancoReceptor)
        if not emisor_code:
            raise ServicioBanxicoError(f"Banco emisor no reconocido: '{peticion.bancoEmisor}'")
        if not receptor_code:
            raise ServicioBanxicoError(f"Banco receptor no reconocido: '{peticion.bancoReceptor}'")

        await page.select_option('#input_tipoCriterio', 'T')
        # fill() es instantáneo (sin delay artificial) y dispara los eventos
        # input/change que la validación del portal necesita.
        await page.fill('#input_criterio', peticion.claveRastreo)
        # Seleccionamos el emisor y esperamos a que su handler async termine
        # antes de tocar el receptor.  Si el portal dispara una llamada AJAX
        # (e.g. instituciones.do), expect_response la captura; si no hay AJAX
        # el bloque completa casi de inmediato.
        try:
            async with page.expect_response(
                lambda r: 'instituciones.do' in r.url, timeout=3000
            ) as _resp:
                await page.select_option('#input_emisor', value=emisor_code)
            await _resp.value
        except PlaywrightError:
            # Sin llamada AJAX del handler; esperamos un tick mínimo.
            pass
        await page.fill('#input_cuenta', peticion.cuentaReceptora)
        await page.fill('#input_monto', peticion.monto)
        await page.select_option('#input_receptor', value=receptor_code)
        logger.info("Formulario llenado.")

        if peticion.datosCompletos:
            return await _consulta_completa(page)
        else:
            return await _consulta_basica(page)

    except (TransaccionNoEncontradaError, ServicioBanxicoError):
        raise
    except PlaywrightError as e:
        raise ServicioBanxicoError(f"Error de navegación al conectar con Banxico: {e}") from e


async def _consulta_basica(page) -> dict:
    logger.info("Clic en 'Consultar'.")
    await page.click('#btn_Consultar')
    try:
        # Esperamos a que aparezca el resultado o el mensaje de error en un solo paso,
        # sin pasar por networkidle (que espera todo el tráfico de fondo).
        await page.wait_for_selector('#xxx, #consultaMISPEI strong', timeout=30000)
    except PlaywrightError:
        raise ServicioBanxicoError("Timeout: Banxico no respondió a tiempo.")

    if not await page.query_selector('#xxx'):
        error_el = await page.query_selector('#consultaMISPEI strong')
        msg = (await error_el.text_content()).strip() if error_el else "Error desconocido en Banxico."
        raise TransaccionNoEncontradaError(msg)

    tabla_html = await page.content()
    soup = BeautifulSoup(tabla_html, 'lxml')
    tabla = soup.find('table', id='xxx')
    rows = tabla.find_all("tr")
    data = {
        cell.find_all('td')[0].get_text(strip=True): cell.find_all('td')[1].get_text(strip=True)
        for cell in rows if len(cell.find_all('td')) == 2
    }
    # "Fecha y hora de recepción" viene como "dd/MM/yyyy HH:mm:ss".
    # Extraemos solo la parte de hora para mostrarla al usuario.
    fecha_rec_raw = data.get("Fecha y hora de recepción", "")
    partes_hora = fecha_rec_raw.split(" ")
    hora_op = partes_hora[1] if len(partes_hora) > 1 else None

    return {
        "tipoDatos": "Basico",
        "referencia": data.get("Número de Referencia"),
        "clave": data.get("Clave de Rastreo"),
        "emisor": data.get("Institución emisora del pago"),
        "receptor": data.get("Institución receptora del pago"),
        "estado": data.get("Estado del pago en Banxico"),
        "fechaRecepcion": data.get("Fecha y hora de recepción"),
        "fechaProcesado": data.get("Fecha y hora de procesamiento"),
        "cuenta": data.get("Cuenta Beneficiaria"),
        "monto": data.get('Monto'),
        "horaOperacion": hora_op,
    }


async def _consulta_completa(page) -> dict:
    logger.info("Clic en 'Descargar'.")
    await page.click('#btn_Descargar')
    try:
        await page.wait_for_selector(
            'a[href="descarga.do?formato=XML"], #consultaMISPEI strong',
            timeout=30000,
        )
    except PlaywrightError:
        raise ServicioBanxicoError("Timeout: Banxico no respondió a tiempo.")

    if not await page.query_selector('a[href="descarga.do?formato=XML"]'):
        error_el = await page.query_selector('#consultaMISPEI strong')
        msg = (await error_el.text_content()).strip() if error_el else "Error desconocido en Banxico."
        raise TransaccionNoEncontradaError(msg)

    async with page.expect_download() as download_info:
        await page.click('a[href="descarga.do?formato=XML"]')
    download = await download_info.value
    temp_path = await download.path()

    with open(temp_path, 'r', encoding='utf-8') as f:
        xml_content = f.read()

    df = pd.read_xml(
        io.StringIO(xml_content),
        xpath="//SPEI_Tercero | //SPEI_Tercero/Beneficiario | //SPEI_Tercero/Ordenante",
        dtype='object',
    )
    df = df.where(pd.notna(df), None)
    data = df.to_dict(orient='records')
    spei_tercero, beneficiario, ordenante = data[0], data[1], data[2]

    fecha_op = (
        pd.to_datetime(spei_tercero.get('FechaOperacion')).strftime('%d/%m/%Y')
        if spei_tercero.get('FechaOperacion') else ''
    )
    # Un CEP (Comprobante Electrónico de Pago) solo existe para transacciones
    # liquidadas. Si el download llegó hasta aquí, el estado es definitivamente
    # LIQUIDADA — Banxico no emite CEP para transacciones rechazadas o en proceso.
    return {
        "tipoDatos": "Completo",
        "estado": "Liquidado",
        "clave": spei_tercero.get('claveRastreo'),
        "emisor": ordenante.get('BancoEmisor'),
        "receptor": beneficiario.get('BancoReceptor'),
        "fechaProcesado": f"{fecha_op} {spei_tercero.get('Hora')}",
        "cuenta": beneficiario.get('Cuenta'),
        "monto": beneficiario.get('MontoPago'),
        "nombreReceptor": beneficiario.get('Nombre'),
        "nombreEmisor": ordenante.get('Nombre'),
        "concepto": beneficiario.get('Concepto'),
        "horaOperacion": spei_tercero.get('Hora'),  # "HH:MM:SS" del XML de Banxico
    }
