# 0042 — Copia semanal por pg_dump en el host

**Estado:** Aceptada

## Contexto

La ADR 0041 desplegó la v2 en un servidor real y dejó escrita, en sus consecuencias, una
deuda explícita: *«No hay copia de seguridad automática del volumen de Postgres en este
cambio. Un `docker compose down -v` borra el trabajo de los entrenadores. Queda pendiente
decidir un `pg_dump` programado antes de meter datos reales de un club.»* El propio
`docker-compose.prod.yml` lleva un comentario junto a `postgres` que apunta a `pg_dump` como
la vía para un volcado, sin que nadie lo hubiera escrito.

El servidor (`ubuntu@vnic-kartas`) es un host Linux con Docker que aloja varias aplicaciones
—InterZone, otra app, `n8n`, `portainer`, Nginx Proxy Manager— bajo el usuario `ubuntu`, que
está en el grupo `docker`. Toda la persistencia de InterZone está en un único volumen de
Postgres; el servicio `servidor` no monta nada y no escribe a disco. El contenedor de la base
es `interzone-postgres-1` y no publica puerto al host; `pg_dump`/`psql` dentro de él toman las
credenciales de su propio entorno sin *prompt*. `pg_restore` **no** está instalado en el host.

La spec 062 fija los 36 escenarios de la copia; esta ADR fija el porqué de cada decisión y lo
que se deja fuera a propósito.

## Decisión

1. **Volcado lógico con `pg_dump -Fc`, ejecutado dentro del contenedor**, no copia física del
   volumen. El binario es entonces siempre el mismo que el servidor —hoy y cuando se suba de
   versión mayor—, el volcado sobrevive a un cambio de versión de Postgres (una copia física
   de un directorio de datos de PG 18 no la abre PG 19), y arrastra lo que Prisma no expresa:
   las 26 restricciones `CHECK` escritas a mano en el SQL de las migraciones, la función
   `celdas_validas(integer[])` y la tabla `_prisma_migrations`. El formato *custom* ya viene
   comprimido (nada de `.gz`) y `pg_restore -l` lee su índice como sonda de integridad. No se
   usa `pg_dumpall`: el clúster tiene un rol y una base, y el rol lo recrea el *entrypoint* de
   la imagen desde el `.env`.

2. **Junto a cada volcado se guarda una copia del `.env` de la raíz.** Sin él el stack no
   arranca y `POSTGRES_PASSWORD` no es recuperable (el rol guarda un hash SCRAM). No añade
   exposición: el volcado ya es más sensible que el `.env` —lleva los hashes `scrypt` de todas
   las cuentas y los correos de la lista blanca—, así que el directorio ya está protegido al
   nivel que el `.env` necesita.

3. **El disparador es `cron` del host, no un servicio en `compose` ni un *timer* de
   systemd.** Un servicio en `compose` exigiría montar `/var/run/docker.sock` (root del host
   en un contenedor, inaceptable en un stack cuyo `servidor` corre como `USER node`) o TCP con
   credenciales en su entorno, y `deploy.sh down` pararía las copias en silencio. Un *timer*
   de systemd tiene una ventaja real (`Persistent=true` recupera la ejecución perdida) pero
   cuesta dos ficheros y un `daemon-reload` para un host que está siempre encendido; el script
   no cambia si algún día se prefiere. El `cron` se instala **a mano una sola vez** —en un
   servidor nuevo hay que repetirlo, no está en el repositorio—, envuelto en `flock -n`.

4. **El script vive en el repositorio; los volcados y el `cron`, fuera.** `copia-seguridad.sh`
   es un fichero versionado: un `git reset --hard` lo restaura, no lo borra. Los volcados van
   a `~/copias-interzone/` —fuera del árbol del repositorio, inmune a `git clean -fdx`, y
   fuera de todo volumen de Docker, inmune a `down -v`—, con permisos `0600` y el directorio
   `0700`.

5. **Retención por número de ficheros, nunca por antigüedad: 8 semanales y 3 previas a
   despliegue.** Una purga por edad (`find -mtime +N -delete`) vaciaría el directorio justo
   cuando las copias llevan semanas fallando y son lo único que queda; contando ficheros es
   imposible bajar del límite. La purga corre **después** de aceptar la copia nueva. Cada
   origen (`semanal-`, `previa-`) rota por separado, para que las copias previas a un
   despliegue no expulsen la historia semanal. El número 8 sale del modo de descubrimiento
   típico —*«el 5-1 de defensa que preparé en abril ya no está»*, que se ve en
   pretemporada—, no del volumen de datos (el volcado ocupa ~37 KB).

6. **Una copia nueva se acepta solo si está completa y no ha encogido de golpe.** Se escribe a
   un fichero `.parcial` y se renombra con un `mv` atómico solo tras comprobarla: un fichero
   con nombre definitivo es siempre una copia completa. Se rechaza si su tamaño es menos de la
   mitad del de la última copia aceptada del mismo origen —una base recién inicializada tras un
   `down -v` accidental produciría un volcado válido pero casi vacío que, en 8 semanas,
   rotaría las copias buenas por copias inútiles—. La primera copia no tiene con qué compararse
   y se acepta.

7. **`deploy-servidor.sh` gana un paso 0 que avisa —sin bloquear— si la última copia semanal
   no está fresca, y toma una copia `previa` antes de reconstruir.** Bloquear el despliegue por
   un fallo de copias empujaría a saltarse el script. `deploy.sh` manda su banner
   `==> ENTORNO=...` a la salida de error para que `deploy.sh ps -q postgres` devuelva solo el
   identificador del contenedor.

## Consecuencias

- La copia protege contra un `down -v`, contra una migración destructiva y contra un borrado
  accidental de un entrenador. **No protege contra la pérdida del host, un disco roto ni
  ransomware:** todo vive en el mismo disco. Una copia fuera del host es otra decisión, con su
  propio transporte, cifrado y destino. **Criterio de revisión: cuando entren datos reales de
  un club, sacar una copia fuera del host deja de ser opcional.**
- No hay notificación activa. Si nadie despliega durante semanas, un `cron` que ha dejado de
  ejecutarse no avisa a nadie —el aviso de frescura solo se ve en la consola del despliegue—.
  **Mismo criterio de revisión que el punto anterior:** con datos reales, un *dead man's
  switch* (un `curl` a un servicio que alerta cuando el ping no llega) pasa a ser necesario.
- Las copias no se cifran. Mientras no salgan del host, la clave viviría en el mismo disco y
  sería legible por el mismo usuario que ya puede leer la base entera con un `docker exec`.
  Obligatorio en el instante en que una copia salga del host (herramienta entonces:
  `openssl enc`, ya presente en el host).
- `deploy.sh` y `deploy-servidor.sh` se tocan fuera del protocolo de specs de `CLAUDE.md` —es
  infraestructura, no dominio, y queda constancia aquí de que es a propósito—.
- El sello de los nombres es a segundos (`AAAAMMDDThhmmssZ`, UTC). Dos copias del mismo origen
  en el mismo segundo colisionan: la segunda falla con «nombre ya existe» en vez de crear un
  sello nuevo. Para la copia semanal es inofensivo (el `flock` del `cron` ya serializa) y para
  la `previa` del despliegue también (una por despliegue). Encadenar copias del mismo tipo en
  bucle sí lo nota; no se consideró un caso a soportar.
- La restauración en producción es un procedimiento de consola documentado en la spec 062
  (sección «Verificación y restauración»), no automatizado: para `web` y `servidor`, recrea la
  base con `DROP DATABASE ... WITH (FORCE)`, `pg_restore --exit-on-error`, y deja que el
  `prisma migrate deploy` del arranque del contenedor aplique las migraciones que a esos datos
  les falten. Nunca se restaura una copia más nueva que el código desplegado. Si el desastre
  incluyó el host, el *Proxy Host* de Nginx Proxy Manager se recrea a mano en su interfaz: no
  está en este repositorio ni en estas copias.

## Alternativas descartadas

- **Copia física del volumen `interzone-datos`** (un `tar` del directorio de datos): con
  Postgres en marcha no es *crash-consistent* —es una mezcla de instantes—, y queda atada a la
  versión mayor y al *build* exacto. Hacerlo bien exige archivado de WAL, es decir, el
  andamiaje completo de PITR.
- **Point-in-time recovery / archivado de WAL / réplica en caliente**: recuperar «el estado de
  las 15:42 del martes» es otro orden de complejidad operativa. Aquí el grano es la semana.
- **Herramientas de backup externas** (`pgBackRest`, `barman`, `wal-g`): el proyecto hace la
  autenticación entera con `node:crypto` y presume de cero dependencias. Una copia lógica
  semanal se resuelve con `pg_dump` —ya en la imagen— y `cron` —ya en el host—.
- **Retención abuelo-padre-hijo (GFS)**: resuelve el conflicto entre retención larga y coste
  de almacenamiento. Con volcados de decenas de KB ese conflicto no existe; la retención plana
  de 8 semanas ya cubre dos meses. Si algún día se quiere memoria más larga, se sube el 8.
