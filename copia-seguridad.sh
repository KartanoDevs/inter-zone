#!/usr/bin/env bash
# InterZone — copia de seguridad de la base de datos, para lanzar desde el servidor.
#
# Toma un volcado lógico de Postgres con pg_dump -Fc DENTRO del contenedor (el binario es
# entonces siempre el mismo que el servidor, y las credenciales ya están en su entorno: este
# script no lee ninguna), lo deja en un directorio fuera del árbol del repositorio y fuera de
# todo volumen de Docker, y rota las copias por número, nunca por antigüedad. Junto a cada
# volcado guarda una copia del .env de la raíz, sin el cual el stack no arranca.
#
# Uso (con `bash`, como deploy.sh: el repo no versiona el bit +x):
#   bash copia-seguridad.sh copia [semanal|previa]   toma una copia y la acepta o la rechaza
#   bash copia-seguridad.sh comprobar                ¿hay una copia semanal reciente y legible?
#   bash copia-seguridad.sh verificar <fichero>      la restaura en un Postgres desechable
#
# El cron semanal (instalar a mano una vez, como el usuario del despliegue):
#   17 4 * * 0  flock -n /tmp/interzone-copia.lock bash /home/ubuntu/projects/interZone/inter-zone/copia-seguridad.sh copia semanal >> /home/ubuntu/copias-interzone/copia.log 2>&1
#
# Solo corre sobre el clon cuyo .env tenga COPIAS_DE_SEGURIDAD=si (por defecto, "si": lo único
# que existía antes de esto). El clon de desarrollo (ADR 0044) lleva COPIAS_DE_SEGURIDAD=no:
# no guarda datos que importe perder, y así una copia lanzada por error ahí nunca escribe nada.
#
# `spec 062`. Ni pg_dump ni pg_restore hacen falta en el host: todo corre en el contenedor.
set -euo pipefail
umask 077
cd "$(dirname "$0")"

# --- Configuración -------------------------------------------------------------------------

COPIAS_DE_SEGURIDAD="$(grep -E '^COPIAS_DE_SEGURIDAD=' .env 2>/dev/null | tail -n1 | cut -d '=' -f2- || true)"
COPIAS_DE_SEGURIDAD="${COPIAS_DE_SEGURIDAD:-si}"

# El proyecto compose de este clon (interzone en producción, interzone-dev en desarrollo):
# de ahí sale por defecto el nombre del contenedor de Postgres, igual que lo deriva Compose.
PROYECTO_COMPOSE="$(grep -E '^PROYECTO_COMPOSE=' .env 2>/dev/null | tail -n1 | cut -d '=' -f2- || true)"
PROYECTO_COMPOSE="${PROYECTO_COMPOSE:-interzone}"

CONTENEDOR="${INTERZONE_POSTGRES:-${PROYECTO_COMPOSE}-postgres-1}"
DESTINO="${INTERZONE_COPIAS:-$HOME/copias-interzone}"
IMAGEN_PG="postgres:18-alpine"   # la misma que docker-compose.prod.yml — para `verificar`

SEMANALES_A_GUARDAR=8
PREVIAS_A_GUARDAR=3

# Tablas (13 de datos + _prisma_migrations) y CHECK medidos en producción — spec 062, E4/E28.
TABLAS_ESPERADAS=14
CHECKS_ESPERADOS=26

# --- Utilidades ---------------------------------------------------------------------------

log() {
  # Una línea por evento, con el instante en UTC. Va a stdout; el cron la redirige al fichero.
  printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

morir() {
  log "FALLO $*"
  exit 1
}

sello_utc() {
  date -u +%Y%m%dT%H%M%SZ
}

# Identificador del contenedor de Postgres, o falla si el stack no está en marcha (E18).
id_contenedor() {
  local id
  id="$(docker ps --filter "name=^${CONTENEDOR}$" --format '{{.ID}}' 2>/dev/null || true)"
  case "$id" in
    ?*[!0-9a-f]* | '') return 1 ;;
    *) printf '%s\n' "$id" ;;
  esac
}

# Bytes de un fichero, portable entre GNU y BSD stat.
tam() {
  stat -c %s "$1" 2>/dev/null || stat -f %z "$1"
}

# --- copia ------------------------------------------------------------------------------

tomar_copia() {
  local origen="${1:-semanal}"
  case "$origen" in
    semanal | previa) ;;
    *) morir "origen desconocido: $origen (usa 'semanal' o 'previa')" ;;
  esac

  local id
  id="$(id_contenedor)" || morir "paso=contenedor el contenedor $CONTENEDOR no está en marcha"

  mkdir -p "$DESTINO"
  chmod 700 "$DESTINO"

  local sello destino_final parcial
  sello="$(sello_utc)"
  destino_final="$DESTINO/${origen}-${sello}.dump"
  parcial="$destino_final.parcial"

  [ -e "$destino_final" ] && morir "paso=nombre ya existe $destino_final; no se sobrescribe"

  # El volcado corre dentro del contenedor: mismo binario que el servidor, credenciales ya
  # presentes en su entorno. Las comillas simples dejan que $POSTGRES_* las expanda la shell
  # de dentro — en `ps` del host no se ve ni el usuario ni la base.
  local err_pg_dump
  err_pg_dump="$DESTINO/.pg_dump.err.$$"
  if ! docker exec -i "$id" sh -c \
    'pg_dump -Fc --lock-wait-timeout=60000 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
    >"$parcial" 2>"$err_pg_dump"; then
    local motivo
    motivo="$(tr '\n' ' ' <"$err_pg_dump" | sed 's/  */ /g; s/^ *//; s/ *$//')"
    rm -f "$parcial" "$err_pg_dump"
    morir "paso=pg_dump ${motivo:-el volcado falló (disco lleno, bloqueo de migración o base inaccesible)}"
  fi
  rm -f "$err_pg_dump"

  # Un volcado vacío pero con cabecera válida (base recién inicializada tras un `down -v`)
  # rotaría las copias buenas por copias inútiles. Se rechaza si encoge más de la mitad
  # respecto a la última copia aceptada del mismo origen (E10). La primera no compara (E11).
  local ultima_buena
  ultima_buena="$(ls -1 "$DESTINO/${origen}-"*.dump 2>/dev/null | sort | tail -n1 || true)"
  if [ -n "$ultima_buena" ]; then
    local t_nueva t_vieja
    t_nueva="$(tam "$parcial")"
    t_vieja="$(tam "$ultima_buena")"
    if [ "$((t_nueva * 2))" -lt "$t_vieja" ]; then
      mv "$parcial" "$destino_final.rechazado"
      morir "paso=tamano la copia nueva ($t_nueva B) es menos de la mitad de la anterior ($t_vieja B); guardada como .rechazado"
    fi
  fi

  # Solo ahora, con la copia comprobada, se le da nombre definitivo (E8). Un mv en el mismo
  # sistema de ficheros es atómico: un fichero con nombre definitivo es siempre completo.
  mv "$parcial" "$destino_final"

  # El .env viaja con la copia: sin él el stack no arranca y POSTGRES_PASSWORD no se recupera.
  # `cp` sin -p para que el fichero nazca con el umask 077; luego un chmod explícito porque el
  # .env de origen suele venir con permisos más laxos.
  if [ -f .env ]; then
    cp .env "$DESTINO/entorno-${sello}.env"
    chmod 600 "$DESTINO/entorno-${sello}.env"
  else
    log "AVISO no hay .env en la raíz; la copia $sello va sin él"
  fi

  # La purga corre DESPUÉS de aceptar, nunca antes, y cuenta ficheros: es imposible que vacíe
  # el directorio aunque todas las copias sean viejas (E15, E16).
  purgar "$origen"

  log "OK ${origen}-${sello}.dump $(tam "$destino_final") B"
}

purgar() {
  local origen="$1" guardar
  case "$origen" in
    semanal) guardar=$SEMANALES_A_GUARDAR ;;
    previa) guardar=$PREVIAS_A_GUARDAR ;;
    *) return 0 ;;
  esac

  local sobran
  sobran="$(ls -1 "$DESTINO/${origen}-"*.dump 2>/dev/null | sort | head -n "-${guardar}" || true)"
  [ -z "$sobran" ] && return 0

  printf '%s\n' "$sobran" | while IFS= read -r viejo; do
    [ -z "$viejo" ] && continue
    rm -f "$viejo"
    # Su .env compañero se va con él.
    local sello_viejo
    sello_viejo="$(basename "$viejo" .dump)"
    sello_viejo="${sello_viejo#"${origen}"-}"
    rm -f "$DESTINO/entorno-${sello_viejo}.env"
    log "PURGA $(basename "$viejo")"
  done
}

# --- comprobar -------------------------------------------------------------------------

comprobar_frescura() {
  local reciente
  reciente="$(ls -1 "$DESTINO/semanal-"*.dump 2>/dev/null | sort | tail -n1 || true)"

  if [ -z "$reciente" ]; then
    echo "AVISO: no hay ninguna copia semanal en $DESTINO. Revisa $DESTINO/copia.log" >&2
    exit 1
  fi

  # El sello del nombre es la fuente de la fecha: no depende del reloj ni del mtime.
  local sello fecha_copia ahora dias
  sello="$(basename "$reciente" .dump)"
  sello="${sello#semanal-}"
  fecha_copia="$(date -u -d "${sello:0:8} ${sello:9:2}:${sello:11:2}:${sello:13:2}" +%s 2>/dev/null \
    || date -u -j -f '%Y%m%dT%H%M%SZ' "$sello" +%s)"
  ahora="$(date -u +%s)"
  dias="$(((ahora - fecha_copia) / 86400))"

  if [ "$dias" -gt 8 ]; then
    echo "AVISO: la última copia semanal es de hace $dias días ($sello). Revisa $DESTINO/copia.log" >&2
    exit 1
  fi

  # Y que sea legible de verdad, no solo reciente. pg_restore -l no acepta '-' como entrada,
  # así que el fichero se monta de solo lectura en un contenedor desechable.
  if ! docker run --rm -v "$reciente:/copia.dump:ro" "$IMAGEN_PG" \
    pg_restore -l /copia.dump >/dev/null 2>&1; then
    echo "AVISO: la última copia ($sello) no se puede leer con pg_restore -l. Revisa $DESTINO/copia.log" >&2
    exit 1
  fi
}

# --- verificar ------------------------------------------------------------------------

verificar_copia() {
  local fichero="${1:-}"
  [ -n "$fichero" ] || morir "paso=argumento uso: $0 verificar <fichero.dump>"
  [ -f "$fichero" ] || morir "paso=argumento no existe $fichero"

  # Contenedor desechable: sin volumen de datos, sin la red interna, sin puertos, fuera del
  # proyecto compose 'interzone'. No puede tocar producción ni lo ven `up --remove-orphans`
  # ni `down -v`. El .dump se monta de solo lectura para no depender de stdin.
  local nombre="interzone-verificacion-$$"
  local limpiar="docker rm -f $nombre >/dev/null 2>&1 || true"
  trap "$limpiar" EXIT

  local absoluto
  absoluto="$(cd "$(dirname "$fichero")" && pwd)/$(basename "$fichero")"

  docker run --rm -d --name "$nombre" -e POSTGRES_PASSWORD=verificacion \
    -v "$absoluto:/copia.dump:ro" "$IMAGEN_PG" >/dev/null \
    || morir "paso=arranque no se pudo levantar el Postgres desechable"

  local intentos=0
  until docker exec "$nombre" pg_isready -U postgres >/dev/null 2>&1; do
    intentos=$((intentos + 1))
    [ "$intentos" -gt 30 ] && morir "paso=arranque el Postgres desechable no respondió en 30 s"
    sleep 1
  done

  docker exec "$nombre" psql -U postgres -q -c 'CREATE DATABASE verificacion' >/dev/null \
    || morir "paso=create no se pudo crear la base de verificación"

  if ! docker exec "$nombre" pg_restore -U postgres -d verificacion --no-owner --no-privileges \
    --exit-on-error /copia.dump >/dev/null 2>&1; then
    morir "paso=restore pg_restore falló sobre $fichero (copia corrupta o truncada)"
  fi

  local resumen
  resumen="$(docker exec "$nombre" psql -U postgres -d verificacion -tAF' ' -c "
    SELECT
      (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'),
      (SELECT count(*) FROM pg_constraint WHERE contype = 'c'),
      (SELECT CASE WHEN celdas_validas(ARRAY[1,2]) THEN 'si' ELSE 'no' END),
      (SELECT count(*) FROM sistema),
      (SELECT count(*) FROM usuario)")"

  local tablas checks celdas sistemas usuarios
  read -r tablas checks celdas sistemas usuarios <<<"$resumen"

  [ "$tablas" = "$TABLAS_ESPERADAS" ] \
    || morir "paso=comprobacion esperaba $TABLAS_ESPERADAS tablas, encontré $tablas"
  [ "$checks" = "$CHECKS_ESPERADOS" ] \
    || morir "paso=comprobacion esperaba $CHECKS_ESPERADOS CHECK, encontré $checks"
  [ "$celdas" = "si" ] \
    || morir "paso=comprobacion celdas_validas(ARRAY[1,2]) no respondió como se esperaba ('$celdas')"

  log "VERIFICADA $(basename "$fichero") — $tablas tablas, $checks CHECK, celdas_validas OK, $sistemas sistemas, $usuarios usuarios"
  eval "$limpiar"
  trap - EXIT
}

# --- Despacho ---------------------------------------------------------------------------

case "${1:-}" in
  copia)
    [ "$COPIAS_DE_SEGURIDAD" = "si" ] \
      || morir "paso=configuracion COPIAS_DE_SEGURIDAD=$COPIAS_DE_SEGURIDAD en este .env; este clon no toma copias (ADR 0044)"
    tomar_copia "${2:-semanal}"
    ;;
  comprobar)
    [ "$COPIAS_DE_SEGURIDAD" = "si" ] \
      || morir "paso=configuracion COPIAS_DE_SEGURIDAD=$COPIAS_DE_SEGURIDAD en este .env; este clon no toma copias (ADR 0044)"
    comprobar_frescura
    ;;
  verificar) verificar_copia "${2:-}" ;;
  *)
    echo "uso: $0 {copia [semanal|previa] | comprobar | verificar <fichero>}" >&2
    exit 2
    ;;
esac
