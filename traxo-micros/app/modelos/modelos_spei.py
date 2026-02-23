
import re
from pydantic import BaseModel, field_validator
from typing import Optional


# Excepciones de dominio
class TransaccionNoEncontradaError(Exception):
    """La transferencia no existe en el portal de Banxico."""
    pass

class ServicioBanxicoError(Exception):
    """El portal de Banxico no respondió o no se pudo completar la consulta."""
    pass


# Modelos de datos
class RastreoPeticion(BaseModel):
    fecha: str
    claveRastreo: str
    bancoEmisor: str
    bancoReceptor: str
    cuentaReceptora: str
    monto: str
    datosCompletos: bool = False

    @field_validator('fecha')
    @classmethod
    def validar_fecha(cls, v: str) -> str:
        if not re.fullmatch(r'\d{2}/\d{2}/\d{4}', v):
            raise ValueError('El formato de fecha debe ser dd/mm/yyyy')
        return v

    @field_validator('monto')
    @classmethod
    def validar_monto(cls, v: str) -> str:
        if not re.fullmatch(r'\d+(\.\d{1,2})?', v):
            raise ValueError('El monto debe ser un número con hasta 2 decimales (ej. "1300.00")')
        return v


class RastreoRespuesta(BaseModel):
    tipoDatos: str
    referencia: Optional[str] = None
    clave: Optional[str] = None
    emisor: Optional[str] = None
    receptor: Optional[str] = None
    estado: Optional[str] = None
    fechaRecepcion: Optional[str] = None
    fechaProcesado: Optional[str] = None
    cuenta: Optional[str] = None
    monto: Optional[str] = None
    nombreReceptor: Optional[str] = None
    nombreEmisor: Optional[str] = None
    concepto: Optional[str] = None
    horaOperacion: Optional[str] = None
