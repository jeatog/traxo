#!/usr/bin/env bash
# Backup diario de PostgreSQL — guarda los últimos 7 días
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$INFRA_DIR/.env"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/traxo}"
RETENER_DIAS=7

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: No se encontró .env en $INFRA_DIR"
  exit 1
fi

source "$ENV_FILE"

mkdir -p "$BACKUP_DIR"

ARCHIVO="$BACKUP_DIR/traxo_$(date +%Y%m%d_%H%M%S).dump"

echo "==> Haciendo backup de la base de datos..."
docker compose -f "$INFRA_DIR/docker-compose.yml" exec -T postgres \
  pg_dump -U "${DB_USER:-traxo}" -d "${DB_NAME:-traxo}" --format=custom \
  > "$ARCHIVO"

echo "==> Backup guardado en $ARCHIVO"

# Eliminar backups más viejos que RETENER_DIAS días
find "$BACKUP_DIR" -name "traxo_*.dump" -mtime +"$RETENER_DIAS" -delete
echo "==> Backups de más de $RETENER_DIAS días eliminados"
