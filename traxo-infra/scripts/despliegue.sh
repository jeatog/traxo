#!/usr/bin/env bash
# Despliega el stack completo en server
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$INFRA_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: No se encontro el archivo .env en $INFRA_DIR"
  echo "       Copia .env.example como .env y completa los valores."
  exit 1
fi

echo "==> Deteniendo contenedores anteriores (si existen)..."
docker compose -f "$INFRA_DIR/docker-compose.yml" --env-file "$ENV_FILE" down

echo "==> Construyendo imagenes..."
docker compose -f "$INFRA_DIR/docker-compose.yml" --env-file "$ENV_FILE" build

echo "==> Iniciando stack..."
docker compose -f "$INFRA_DIR/docker-compose.yml" --env-file "$ENV_FILE" up -d

echo "==> Stack activo. Revisa los logs con:"
echo "    docker compose -f $INFRA_DIR/docker-compose.yml logs -f"
