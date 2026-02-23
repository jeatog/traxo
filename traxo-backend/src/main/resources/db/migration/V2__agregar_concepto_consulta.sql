-- V2: Agrega columnas concepto y hora_operacion a consultas
-- concepto: descripcion de la transferencia (ej. "Renta enero"). No sensible.
-- hora_operacion: hora del movimiento segun Banxico (HH:mm:ss). Nullable para registros anteriores.

ALTER TABLE consultas
    ADD COLUMN concepto VARCHAR(255),
    ADD COLUMN hora_operacion TIME;
