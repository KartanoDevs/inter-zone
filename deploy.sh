#!/usr/bin/env bash
# Envuelve `docker compose` para no repetir los -f a mano según el entorno. Lee ENTORNO de
# .env (el mismo fichero que ya usa Compose, en la raíz del repo): 'local' añade
# docker-compose.local.yml (publica el puerto de `web` y no depende de la red externa real
# del proxy); cualquier otro valor, o su ausencia, es producción y usa solo
# docker-compose.prod.yml. Todo lo demás se pasa tal cual a `docker compose`.
#
# Uso:
#   ./deploy.sh up -d --build
#   ./deploy.sh ps
#   ./deploy.sh exec servidor npm run seed:prod
#   ./deploy.sh logs -f servidor
#   ./deploy.sh down -v
#
# En Windows sin permiso de ejecución: `bash deploy.sh ...`.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "No hay .env en la raíz. cp .env.produccion.example .env y rellénalo primero." >&2
  exit 1
fi

ENTORNO="$(grep -E '^ENTORNO=' .env | tail -n1 | cut -d '=' -f2- || true)"

if [ "$ENTORNO" = "local" ]; then
  echo "==> ENTORNO=local: docker-compose.prod.yml + docker-compose.local.yml"
  docker compose -f docker-compose.prod.yml -f docker-compose.local.yml "$@"
else
  echo "==> ENTORNO=${ENTORNO:-producción}: docker-compose.prod.yml"
  docker compose -f docker-compose.prod.yml "$@"
fi
