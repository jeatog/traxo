"""
Reglas específicas por banco para la extracción OCR de comprobantes SPEI.

Centraliza heurísticas que dependen del formato propietario de cada institución:
  - Identificadores únicos en el comprobante (nombre de cuenta/producto)
  - Formato esperado de la clave de rastreo
  - Pistas contextuales para el prompt de Claude Vision
"""

import logging

logger = logging.getLogger(__name__)

# Sustituciones letra → dígito para claves cuyo cuerpo debe ser numérico.
# Solo confusiones OCR inequívocas (formas muy similares en tipografías bancarias).
_LETRA_A_DIGITO: dict[str, str] = {
    's': '5', 'S': '5',
    'o': '0', 'O': '0',
    'i': '1', 'I': '1', 'l': '1',
    'b': '8', 'B': '8',
    'z': '2', 'Z': '2',
}

# Identificadores exclusivos de banco
# Palabras o frases que aparecen en los comprobantes de un banco específico
# y no se confunden con otros
# La clave debe coincidir con el catálogo de Banxico (se usará como valor de emisor).
IDENTIFICADORES_BANCO: dict[str, list[str]] = {
    'AZTECA': ['guardadito'],
}

# Formato de la clave de rastreo por banco
# Reglas disponibles:
#   usar_vision    — llama a Claude Vision para este banco (default: False).
#   ultimo_char_letra — el último carácter es una letra de verificación;
#                       si OCR lo leyó como '1', corregir a 'I'.
#   cuerpo_numerico   — todos los chars excepto el último deben ser dígitos;
#                       convierte letras OCR ambiguas (s→5, O→0, l→1…).
FORMATO_CLAVE: dict[str, dict] = {
    'AZTECA': {'usar_vision': True, 'ultimo_char_letra': True, 'cuerpo_numerico': True},
    'BBVA': {},
    'BANAMEX': {},
    'CITIBANAMEX': {},
    'BANORTE': {}
}


def detectar_banco_por_contexto(lineas: list[str]) -> str | None:
    """
    Devuelve el nombre canónico del banco si encuentra un identificador exclusivo
    en el texto OCR; None si no hay coincidencia.
    """
    texto_lower = ' '.join(lineas).lower()
    for banco, keywords in IDENTIFICADORES_BANCO.items():
        kw_encontrado = next((kw for kw in keywords if kw in texto_lower), None)
        if kw_encontrado:
            logger.info(
                f"Reglas Bancos → '{kw_encontrado}' detectado en texto OCR → emisor={banco}"
            )
            return banco
    return None


def postprocesar_clave(clave: str, banco: str | None) -> str:
    """
    Aplica correcciones específicas del banco a la clave de rastreo después de OCR/Vision.
    """
    if not clave or not banco:
        logger.debug(
            f"Reglas Bancos → postprocesar_clave omitida (clave={clave!r}, banco={banco!r})"
        )
        return clave
    banco_up = banco.upper()
    for nombre, reglas in FORMATO_CLAVE.items():
        if nombre in banco_up:
            # Regla #1 — cuerpo_numerico: corrige letras-por-dígito en todos los chars
            # excepto el último (que puede ser letra de verificación).
            if reglas.get('cuerpo_numerico') and len(clave) > 1:
                cuerpo = clave[:-1]
                ultimo = clave[-1]
                cuerpo_corregido = ''.join(_LETRA_A_DIGITO.get(c, c) for c in cuerpo)
                if cuerpo_corregido != cuerpo:
                    logger.info(
                        f"Reglas Bancos → Aplica regla [{nombre}] #1 cuerpo_numerico: "
                        f"{cuerpo!r} → {cuerpo_corregido!r}"
                    )
                else:
                    logger.info(
                        f"Reglas Bancos → Regla [{nombre}] #1 cuerpo_numerico: "
                        f"cuerpo ya es numérico (sin cambios)"
                    )
                clave = cuerpo_corregido + ultimo

            # Regla #2 — ultimo_char_letra: si el último char es '1', es la letra 'I'.
            if reglas.get('ultimo_char_letra'):
                if clave[-1] == '1':
                    clave_corregida = clave[:-1] + 'I'
                    logger.info(
                        f"Reglas Bancos → Aplica regla [{nombre}] #2 ultimo_char_letra: "
                        f"'1' → 'I' | {clave!r} → {clave_corregida!r}"
                    )
                    clave = clave_corregida
                else:
                    logger.info(
                        f"Reglas Bancos → Regla [{nombre}] #2 ultimo_char_letra: "
                        f"último char='{clave[-1]}' (no es '1', sin cambios)"
                    )
            break
    else:
        logger.debug(f"Reglas Bancos → No hay reglas de clave para banco={banco!r}")
    return clave


def debe_usar_vision(banco: str | None) -> bool:
    """
    Vision es OPT-IN: solo corre si el banco está en FORMATO_CLAVE con usar_vision=True.
    """
    if not banco:
        return True
    banco_up = banco.upper()
    for nombre, reglas in FORMATO_CLAVE.items():
        if nombre in banco_up:
            if reglas.get('usar_vision'):
                logger.info(f"Reglas Bancos → usar_vision [{nombre}]: Vision activada")
                return True
            logger.info(
                f"Reglas Bancos → [{nombre}] sin usar_vision: Vision omitida "
                f"(EasyOCR maneja este banco)"
            )
            return False
    # Banco no listado: comportamiento conservador -> Vision puede ayudar
    logger.info(f"Reglas Bancos → banco {banco!r} no listado en reglas: Vision activada por defecto")
    return True


def hint_vision_por_banco(banco: str | None) -> str:
    """
    Retorna una instrucción adicional para el prompt de Claude Vision
    basada en el banco emisor detectado por EasyOCR. Cadena vacía si no aplica.
    """
    if not banco:
        return ''
    if 'AZTECA' in banco.upper():
        logger.info("Reglas Bancos → Añade hint AZTECA al prompt de Claude Vision")
        return (
            '\n- IMPORTANTE: Este comprobante es de Banco Azteca (cuenta Guardadito). '
            'La clave de rastreo de Azteca siempre termina con una LETRA, nunca con un dígito. '
            'Si el último carácter se parece a "1", es la letra "I" — cópiala como "I".'
        )
    return ''
