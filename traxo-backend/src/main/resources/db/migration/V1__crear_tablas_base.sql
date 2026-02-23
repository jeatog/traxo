-- V1: Tablas base de Traxo
-- Usuarios y consultas (historial con minima retencion de datos)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────
-- Tabla: usuarios
-- ─────────────────────────────────────────
CREATE TABLE usuarios (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre          VARCHAR(120) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    contrasena_hash VARCHAR(255) NOT NULL,
    activo          BOOLEAN     NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usuarios_email ON usuarios (email);

-- ─────────────────────────────────────────
-- Tabla: consultas (historial)
-- NUNCA almacenar: CLABE, clave de rastreo, nombre ordenante/beneficiario
-- ─────────────────────────────────────────
CREATE TYPE estado_transferencia AS ENUM ('LIQUIDADA', 'RECHAZADA', 'EN_PROCESO', 'NO_ENCONTRADA');

CREATE TABLE consultas (
    id              UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario      UUID                  NOT NULL,
    fecha_consulta  TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
    fecha_operacion DATE                  NOT NULL,
    monto           NUMERIC(18, 2)        NOT NULL,
    banco_emisor    VARCHAR(100)          NOT NULL,
    banco_receptor  VARCHAR(100)          NOT NULL,
    estado          estado_transferencia  NOT NULL,
    alias           VARCHAR(100),

    CONSTRAINT fk_consultas_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios (id) ON DELETE CASCADE
);

CREATE INDEX idx_consultas_usuario_id ON consultas (id_usuario);
CREATE INDEX idx_consultas_fecha_consulta ON consultas (id_usuario, fecha_consulta DESC);
