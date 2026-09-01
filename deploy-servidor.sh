#!/usr/bin/env bash
# InterZone — actualiza y relanza el despliegue en el servidor, de una pasada. Este mismo
# script sirve para el clon de producción y el de desarrollo (ADR 0044): la rama que trae y si
# toma copias de seguridad los decide el `.env` de CADA clon, nunca un argumento.
#
#   0. Si COPIAS_DE_SEGURIDAD=si, avisa si las copias no están frescas y toma una copia
#      `previa` antes de tocar nada. Solo avisa: nunca aborta el despliegue por esto (spec
#      062). Si vale "no" (el clon de desarrollo), este paso se salta explícitamente: ahí no
#      hay copias porque no hay nada que no se pueda recrear con `seed:prod`.
#   1. Trae RAMA_DESPLIEGUE de origin y deja el working tree EXACTAMENTE igual que
#      origin/<rama> (git reset --hard + git clean). Cualquier cambio local del
#      servidor se descarta a propósito: esta máquina no se edita a mano.
#   2. Reconstruye las imágenes y recrea los contenedores con bash deploy.sh, que
#      lee ENTORNO de .env y elige los -f de compose (producción por defecto).
#      Las migraciones de Prisma las corre el propio contenedor `servidor` en su
#      CMD (`prisma migrate deploy`), aquí no se tocan.
#   3. Espera a que `servidor` quede healthy.
#   4. Siembra el catálogo base (`npm run seed:prod`). Es idempotente: solo crea
#      equipo + jugador + sistemas de ejemplo si la base está vacía, así que
#      ejecutarlo en cada despliegue es seguro y cubre el primer arranque.
#   5. Muestra el estado de los contenedores.
#
# Uso, desde cualquier sitio:
#   ./deploy-servidor.sh
#
# Requisitos: git, docker (con el plugin compose) y un .env relleno en la raíz.
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")" && pwd)"
cd "$RAIZ"

if [ ! -f .env ]; then
  echo "No hay .env en la raíz ($RAIZ). Copia .env.produccion.example a .env y rellénalo." >&2
  exit 1
fi

# Mismo idiom que deploy.sh para leer una variable del .env sin cargarlo entero en el shell.
leer_env() {
  grep -E "^$1=" .env | tail -n1 | cut -d '=' -f2- || true
}

RAMA="$(leer_env RAMA_DESPLIEGUE)"
RAMA="${RAMA:-main}"
COPIAS_DE_SEGURIDAD="$(leer_env COPIAS_DE_SEGURIDAD)"
COPIAS_DE_SEGURIDAD="${COPIAS_DE_SEGURIDAD:-si}"

echo "==> 0/5  Copias de seguridad"
if [ "$COPIAS_DE_SEGURIDAD" != "si" ]; then
  echo "    COPIAS_DE_SEGURIDAD=$COPIAS_DE_SEGURIDAD: me lo salto a propósito (entorno de desarrollo)"
elif [ -f copia-seguridad.sh ]; then
  if ! bash copia-seguridad.sh comprobar; then
    echo "    (el despliegue sigue: el aviso no lo bloquea)"
  fi
  # Una copia de lo que hay AHORA, antes de reconstruir y migrar. No aborta si falla.
  bash copia-seguridad.sh copia previa \
    || echo "    AVISO: no se pudo tomar la copia previa; el despliegue sigue"
else
  echo "    copia-seguridad.sh no está; me lo salto"
fi

echo "==> 1/5  Trayendo origin/$RAMA y descartando cambios locales"
git fetch origin "$RAMA"
git checkout "$RAMA"
git reset --hard "origin/$RAMA"
git clean -fd
echo "    HEAD: $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s)"

echo "==> 2/5  Reconstruyendo y recreando el stack"
bash deploy.sh up -d --build --remove-orphans

echo "==> 3/5  Esperando a que 'servidor' quede healthy"
for i in $(seq 1 60); do
  estado="$(bash deploy.sh ps --format '{{.Name}} {{.Health}}' 2>/dev/null | awk '/servidor/ {print $2}')"
  case "$estado" in
    healthy)
      echo "    servidor healthy"
      break
      ;;
    unhealthy)
      echo "    servidor está unhealthy. Logs:" >&2
      bash deploy.sh logs --tail 50 servidor >&2
      exit 1
      ;;
  esac
  if [ "$i" -eq 60 ]; then
    echo "    'servidor' no llegó a healthy en 5 min. Logs:" >&2
    bash deploy.sh logs --tail 50 servidor >&2
    exit 1
  fi
  sleep 5
done

echo "==> 4/5  Sembrando el catálogo base (idempotente)"
bash deploy.sh exec -T servidor npm run seed:prod

echo "==> 5/5  Estado del stack"
bash deploy.sh ps

echo
echo "Despliegue de origin/$RAMA terminado."
