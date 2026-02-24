
import io
import logging
import re

import numpy as np
from app.reglas_bancos import (
    debe_usar_vision,
    detectar_banco_por_contexto,
    hint_vision_por_banco,
    postprocesar_clave,
)
from PIL import Image, ImageEnhance

logger = logging.getLogger(__name__)

_CAMPOS = ['fechaOperacion', 'monto', 'claveRastreo', 'emisor', 'receptor', 'cuentaBeneficiaria']

_MESES_ES: dict[str, str] = {
    'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
    'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
    'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12',
}

_MESES_EN_ABREV: dict[str, str] = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
}

_MESES_ES_ABREV: dict[str, str] = {
    'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'ago': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12',
}

_MESES_ABREV: dict[str, str] = {**_MESES_EN_ABREV, **_MESES_ES_ABREV}


def inicializar_lector():
    """
    Crea el Reader de EasyOCR con soporte español + inglés.
    Carga los modelos desde ~/.EasyOCR/.
    Llamar una sola vez al arranque; el objeto es thread-safe para lecturas.
    """
    import easyocr  # importación diferida: el módulo tarda en cargar PyTorch
    logger.info("Inicializando lector EasyOCR (es, en) — puede tardar unos segundos...")
    reader = easyocr.Reader(['es', 'en'], gpu=False, verbose=False)
    logger.info("EasyOCR listo.")
    return reader


def extraer_texto(imagen_bytes: bytes, lector) -> list[str]:
    """
    Preprocesa la imagen y ejecuta OCR.

    Preprocesado:
      - Escala al ancho máximo de 1 500 px (mantiene proporción)
      - Convierte a escala de grises
      - Aumenta el contraste ×1.5 para mejorar la detección de texto sobre fondos de color

    Retorna lista de cadenas detectadas (orden aproximado de arriba a abajo).
    """
    img = Image.open(io.BytesIO(imagen_bytes)).convert('RGB')

    max_ancho = 1500
    if img.width > max_ancho:
        factor = max_ancho / img.width
        img = img.resize((max_ancho, int(img.height * factor)), Image.LANCZOS)

    gris = img.convert('L')
    realzada = ImageEnhance.Contrast(gris).enhance(1.5)
    arr = np.array(realzada)

    resultados = lector.readtext(arr, detail=0, paragraph=False)
    return [str(r).strip() for r in resultados if str(r).strip()]


def parsear_campos_spei(
    lineas: list[str],
    bancos_conocidos: list[str] | None = None,
) -> tuple[dict[str, str | None], list[str]]:
    """
    Extrae campos SPEI del texto OCR.

    Estrategia:
      - Monto: símbolo $ o label "monto/importe/cantidad" seguido de número
      - Fecha: varios formatos (dd/mm/yyyy, "23 de febrero de 2026", yyyy-mm-dd, etc)
      - Clave rastreo: label + token alfanumérico
      - Emisor/Receptor: label de banco + nombre; normalizado contra lista conocida

    Retorna (campos_dict, faltantes_list).
    """
    texto = ' '.join(lineas)
    texto_lower = texto.lower()

    campos: dict[str, str | None] = {c: None for c in _CAMPOS}

    # monto
    # Prioridad 1: etiqueta explícita → señala el monto correcto aunque haya
    # varios $ en el documento (ej. Banorte tiene "Comisión: $0.00" y "IVA: $0.00"
    # además del monto real). [:\s]*\$?\s* tolera "Cantidad $ 1.00" o "Monto: 235.00".
    monto_m = re.search(
        r'(?:monto|importe|cantidad)[:\s]*\$?\s*([\d,]+\.\d{2})', texto_lower,
    )
    # Prioridad 2: primer símbolo $ del documento (fallback para recibos sin etiqueta)
    if not monto_m:
        monto_m = re.search(r'\$\s*([\d,]+\.?\d{0,2})', texto)
    if monto_m:
        raw = monto_m.group(1).replace(',', '')
        try:
            campos['monto'] = f"{float(raw):.2f}"
        except ValueError:
            pass

    # fechaOperacion
    # Patrón 1: dd/mm/yyyy o dd-mm-yyyy
    fecha_m = re.search(r'\b(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})\b', texto)
    if fecha_m:
        d, m, a = fecha_m.group(1), fecha_m.group(2), fecha_m.group(3)
        campos['fechaOperacion'] = f"{a}-{m.zfill(2)}-{d.zfill(2)}"

    if not campos['fechaOperacion']:
        # Patrón 2: "23 de febrero de 2026" / "23 febrero 2026"
        patron_mes = '|'.join(_MESES_ES.keys())
        fecha_m2 = re.search(
            rf'\b(\d{{1,2}})\s+(?:de\s+)?({patron_mes})(?:\s+de)?\s+(\d{{4}})\b',
            texto_lower,
        )
        if fecha_m2:
            d, mes_str, a = fecha_m2.group(1), fecha_m2.group(2), fecha_m2.group(3)
            campos['fechaOperacion'] = f"{a}-{_MESES_ES[mes_str]}-{d.zfill(2)}"

    if not campos['fechaOperacion']:
        # Patrón 1b: dd/Mon/yyyy  →  22/Feb/2026
        fecha_m1b = re.search(r'\b(\d{1,2})/([A-Za-z]{3})/(\d{4})\b', texto)
        if fecha_m1b:
            d, mon_str, a = fecha_m1b.group(1), fecha_m1b.group(2).lower(), fecha_m1b.group(3)
            if mon_str in _MESES_ABREV:
                campos['fechaOperacion'] = f"{a}-{_MESES_ABREV[mon_str]}-{d.zfill(2)}"

    if not campos['fechaOperacion']:
        # Patrón 2b: dd mes_abrev yyyy (con espacio)  →  "20 feb 2026", "20 Feb 2026"
        patron_abrev = '|'.join(_MESES_ABREV.keys())
        fecha_m2b = re.search(
            rf'\b(\d{{1,2}})\s+({patron_abrev})\s+(\d{{4}})\b',
            texto_lower,
        )
        if fecha_m2b:
            d, mes_str, a = fecha_m2b.group(1), fecha_m2b.group(2), fecha_m2b.group(3)
            campos['fechaOperacion'] = f"{a}-{_MESES_ABREV[mes_str]}-{d.zfill(2)}"

    if not campos['fechaOperacion']:
        # Patrón 3: yyyy-mm-dd
        fecha_m3 = re.search(r'\b(\d{4})[/\-](\d{2})[/\-](\d{2})\b', texto)
        if fecha_m3:
            a, m, d = fecha_m3.group(1), fecha_m3.group(2), fecha_m3.group(3)
            campos['fechaOperacion'] = f"{a}-{m}-{d}"

    # claveRastreo
    # Búsqueda 1: etiquetas específicas "clave de rastreo" (alta prioridad)
    clave_m = re.search(
        r'(?:clave\s+de\s+rastreo|clave\s+rastreo)[:\s]+([A-Za-z0-9]{6,30})',
        texto_lower,
    )
    # Búsqueda 2: etiquetas genéricas de referencia solo si el valor es suficientemente largo
    # (>=10 chars para evitar capturar folios cortos como "9985739")
    if not clave_m:
        clave_m = re.search(
            r'(?:referencia\s+num[eé]rica|n[uú]mero\s+de\s+referencia|n[uú]m\.?\s*ref)'
            r'[:\s]+([A-Za-z0-9]{10,30})',
            texto_lower,
        )
    if clave_m:
        idx = texto_lower.index(clave_m.group(1), clave_m.start(1))
        raw_clave = texto[idx: idx + len(clave_m.group(1))]
        campos['claveRastreo'] = _normalizar_clave_rastreo(raw_clave)

    # emisor
    # Prioridad 1: identificador exclusivo de banco (máxima certeza).
    # Va primero porque es inequívoco; evita que un regex ruidoso sobreescriba el resultado.
    banco_ctx = detectar_banco_por_contexto(lineas)
    if banco_ctx:
        campos['emisor'] = banco_ctx
        logger.info(f"OCR → emisor asignado por contexto exclusivo: {banco_ctx!r}")

    if not campos['emisor']:
        # Prioridad 2: etiqueta explícita en el texto ("banco origen:", "banco emisor:", ...)
        emisor_m = re.search(
            r'(?:banco\s+origen|banco\s+emisor|institución\s+emisora|banco\s+remitente'
            r'|emisor|ordenante\s+banco|banco\s+ordenante)[:\s]+([^\n\r,\.]{3,40})',
            texto_lower,
        )
        if emisor_m:
            campos['emisor'] = _normalizar_banco(emisor_m.group(1).strip(), bancos_conocidos or [])

    if not campos['emisor']:
        # Prioridad 3: nombre del banco en el encabezado/logo (primeras líneas)
        for linea in lineas[:8]:
            banco = _buscar_banco_en_texto(linea.strip(), bancos_conocidos or [])
            if banco:
                campos['emisor'] = banco
                break

    # receptor
    receptor_m = re.search(
        r'(?:banco\s+destino|banco\s+receptor|institución\s+receptora'
        r'|banco\s+beneficiario|receptor|beneficiario\s+banco'
        r'|nombre\s+del\s+banco|cuenta\s+destino)[:\s]+([^\n\r,\.]{3,60})',
        texto_lower,
    )
    if receptor_m:
        campos['receptor'] = _normalizar_banco(receptor_m.group(1).strip(), bancos_conocidos or [])

    faltantes = [c for c in _CAMPOS if not campos[c]]
    logger.info(f"OCR: campos={campos}, faltantes={faltantes}")
    return campos, faltantes


def _normalizar_clave_rastreo(clave: str) -> str:
    """
    Corrige errores OCR comunes en claves de rastreo SPEI:
      - O (letra O mayúscula) → 0 (cero)  en la parte numérica
      - I (letra I mayúscula) → 1 (uno)   en la parte numérica

    Preserva el prefijo alfabético intacto (ej. "MBAN" en claves BBVA).
    """
    # Solo normalizar claves con prefijo alfabético (formato BBVA: "MBAN..." → "MBAN0100...").
    # Aplica O→0, I→1 a todo el string: el prefijo real ("MBAN") no contiene O ni I,
    # así que no se corrompe.
    #
    # Si la clave empieza con dígito (Azteca: "26022...5I") se deja intacta
    if clave and not clave[0].isdigit():
        return clave.replace('O', '0').replace('I', '1')
    return clave


def extraer_clave_con_vision(
    imagen_bytes: bytes,
    content_type: str = 'image/jpeg',
    banco: str | None = None,
) -> str | None:
    """
    Usa Claude Haiku Vision para leer la clave de rastreo directamente de la imagen,
    evitando la confusión O/0 e I/1 que comete EasyOCR en caracteres alfanuméricos.

    banco: nombre del emisor detectado por EasyOCR; permite añadir pistas contextuales
           al prompt (ej. Azteca → el último carácter es una letra).

    Requiere la variable de entorno ANTHROPIC_API_KEY.
    Si no está configurada o falla, retorna None (fallback silencioso al valor de EasyOCR).
    """
    import os
    import base64

    api_key = os.getenv('ANTHROPIC_API_KEY')
    if not api_key:
        return None

    if not debe_usar_vision(banco):
        return None

    logger.info(f"Claude Vision → invocando con banco={banco!r}")
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        b64 = base64.standard_b64encode(imagen_bytes).decode('utf-8')
        messages: list = [{
            'role': 'user',
            'content': [
                {
                    'type': 'image',
                    'source': {
                        'type': 'base64',
                        'media_type': content_type,
                        'data': b64,
                    },
                },
                {
                    'type': 'text',
                    'text': (
                        'Este es un comprobante de transferencia bancaria SPEI (México).\n'
                        'Encuentra y devuelve ÚNICAMENTE el valor del campo '
                        '"Clave de rastreo" (también puede llamarse "Clave Rastreo SPEI").\n'
                        '- Cópialo exactamente como está impreso, carácter por carácter.\n'
                        '- Distingue con cuidado la letra O mayúscula del dígito 0, '
                        'y la letra I mayúscula del dígito 1.\n'
                        '- Si no encuentras el campo, responde exactamente: NOT_FOUND\n'
                        'Responde SOLO con el código, sin explicación ni texto adicional.'
                        + hint_vision_por_banco(banco)
                    ),
                },
            ],
        }]
        message = client.messages.create(
            model='claude-haiku-4-5-20251001',
            max_tokens=64,
            messages=messages,
        )
        result = message.content[0].text.strip()
        # Las claves SPEI son estrictamente alfanuméricas; elimina cualquier
        # carácter invisible o no imprimible que el modelo pueda incluir
        result = re.sub(r'[^A-Za-z0-9]', '', result)
        result = postprocesar_clave(result, banco)
        logger.info(
            f"Claude Vision → clave={result!r} | "
            f"tokens entrada={message.usage.input_tokens} "
            f"salida={message.usage.output_tokens} "
            f"stop={message.stop_reason}"
        )
        return None if result == 'NOT_FOUND' else result
    except Exception as e:
        logger.warning(f"Claude Vision para clave de rastreo falló: {e}")
        return None


def _buscar_banco_en_texto(texto: str, bancos: list[str]) -> str | None:
    """
    Devuelve el nombre normalizado del banco si encuentra una coincidencia en el texto;
    None si no hay match. A diferencia de _normalizar_banco, no hace fallback al texto
    original para evitar falsos positivos.
    """
    if not bancos:
        return None
    texto_up = texto.upper()
    for banco in bancos:
        banco_up = banco.upper()
        if banco_up in texto_up or texto_up in banco_up:
            return banco
    for banco in bancos:
        palabras = [p for p in banco.upper().split() if len(p) >= 4]
        if any(p in texto_up for p in palabras):
            return banco
    return None


def _normalizar_banco(texto: str, bancos: list[str]) -> str:
    """
    Busca el banco más parecido en la lista conocida (match por subcadena).
    Si no hay coincidencia suficiente, retorna el texto capitalizado tal cual.
    """
    if not bancos:
        return texto.title()
    texto_up = texto.upper()
    for banco in bancos:
        banco_up = banco.upper()
        if banco_up in texto_up or texto_up in banco_up:
            return banco
    # Intento secundario: al menos 4 caracteres en común
    for banco in bancos:
        palabras = [p for p in banco.upper().split() if len(p) >= 4]
        if any(p in texto_up for p in palabras):
            return banco
    return texto.title()
