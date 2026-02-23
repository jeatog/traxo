#!/usr/bin/env bash
# Construye las imágenes Docker sin arrancar los contenedores
# Uso: ./build.sh [servicio...] [--push]
#   Sin argumentos  = cconstruye todos los servicios
#   Con servicio(s) = construye solo los indicados (ej: backend micros)
#   --push          = sube las imágenes al registro después de construir
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE="docker compose -f $INFRA_DIR/docker-compose.yml"

PUSH=false
SERVICES=()

for arg in "$@"; do
    case "$arg" in
        --push) PUSH=true ;;
        *)      SERVICES+=("$arg") ;;
    esac
done

echo "==> Construyendo imágenes de Traxo..."
if [ ${#SERVICES[@]} -gt 0 ]; then
    $COMPOSE build --no-cache "${SERVICES[@]}"
else
    $COMPOSE build --no-cache
fi

if $PUSH; then
    echo "==> Subiendo imágenes al registro..."
    if [ ${#SERVICES[@]} -gt 0 ]; then
        $COMPOSE push "${SERVICES[@]}"
    else
        $COMPOSE push
    fi
fi

echo "==> Listo."
