from pydantic import BaseModel


class OcrRespuesta(BaseModel):
    """
    Resultado del análisis OCR de un comprobante de transferencia SPEI.
    `campos` contiene los valores extraídos (None si no se encontró el campo).
    `faltantes` lista los nombres de campos que no se pudieron leer.
    """
    campos: dict[str, str | None]
    faltantes: list[str]
