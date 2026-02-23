# Traxo

Aplicación web para rastrear transferencias SPEI. El usuario ingresa los datos de su transferencia y Traxo consulta el portal de Banxico para obtener el estado en tiempo real: liquidada, en proceso, devuelta o no encontrada.

---

## Estructura del monorepo

```
traxo/
├── traxo-frontend/   Angular 19 — SPA + PWA
├── traxo-backend/    Spring Boot 3.4 — API REST + JWT
├── traxo-micros/     FastAPI — microservicios Python auxiliares
└── traxo-infra/      Docker Compose — despliegue completo
```

| Módulo | Tecnología principal | README |
|---|---|---|
| `traxo-frontend` | Angular 19, TypeScript, Tailwind CSS | [traxo-frontend/README.md](traxo-frontend/README.md) |
| `traxo-backend` | Spring Boot 3.4, Java 21, PostgreSQL | [traxo-backend/README.md](traxo-backend/README.md) |
| `traxo-micros` | FastAPI, Python 3.12 | [traxo-micros/README.md](traxo-micros/README.md) |
| `traxo-infra` | Docker Compose, Nginx, PostgreSQL 16 | [traxo-infra/README.md](traxo-infra/README.md) |

---

## Quick start

Requisitos: Docker Engine ≥ 24 y Docker Compose v2.

```bash
# 1. Clonar el repositorio
git clone <url> traxo && cd traxo/traxo-infra

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env: completar JWT_SECRETO y MICROS_API_KEY

# 3. Colocar certificados TLS (ver traxo-infra/README.md)
# nginx/certs/fullchain.pem
# nginx/certs/privkey.pem

# 4. Desplegar el stack completo
./scripts/despliegue.sh
```

La base de datos y las migraciones se aplican automáticamente al arrancar.

Ver [traxo-infra/README.md](traxo-infra/README.md) para actualizar servicios individuales, gestionar backups y opciones de diagnóstico.

---

## Documentación

- [PRIVACIDAD.md](PRIVACIDAD.md) — qué datos se almacenan, qué no, y decisiones de seguridad

---

## Licencia

MIT — ver [LICENSE](LICENSE). Copyright © 2026 Jesús A. Toledo.
