# 062 — Que el trabajo del entrenador sobreviva a un accidente

**Estado:** Completada
**Paso de la hoja de ruta:** 8

## Problema

Todo lo que los entrenadores construyen —cada sistema, cada formación, cada zona de defensa,
cada cuenta de jugador con sus medallas— vive en una sola base de datos dentro de un solo
volumen de Docker en un solo servidor. Un `docker compose down -v` tecleado por costumbre, una
migración que sale mal, un entrenador que borra el sistema equivocado, y no hay vuelta atrás:
no existe ninguna copia. La ADR 0041 ya lo dejó escrito como deuda —«queda pendiente decidir un
`pg_dump` programado antes de meter datos reales de un club»— y ese momento es ahora.

## Objetivo

Cada domingo, el servidor guarda solo una copia completa y restaurable de su base de datos en
un sitio que sobrevive a que se borre el stack, y hay un procedimiento probado para volver a
poner esa copia en producción.

## Fuera de alcance

Esta spec autoriza explícitamente crear y tocar ficheros fuera de `src/app/domain/`, que
`CLAUDE.md` protege por defecto. Toda la spec es infraestructura de shell y Docker en la raíz
del repositorio; `domain/`, `application/`, `infrastructure/`, `ui/` y `server/` no se tocan.
La autorización se limita a estos ficheros:

- `copia-seguridad.sh` (nuevo, en la raíz, junto a `deploy.sh` y `deploy-servidor.sh`)
- `deploy.sh` — solo para mover el banner `==> ENTORNO=...` de la salida estándar a la de
  error (`>&2` en los dos `echo`), de modo que `bash deploy.sh ps -q postgres` devuelva
  únicamente el identificador del contenedor. Es un carácter de cambio y no rompe el `awk` de
  `deploy-servidor.sh`, que filtra por `/servidor/` sobre `ps --format`. Ver E13.
- `deploy-servidor.sh` — para añadir, como paso 0, el aviso de frescura de la copia (E27), y la
  copia previa al despliegue (E9). Avisa, nunca aborta.
- `README.md` — la sección de despliegue gana el subcomando de copia, el de restauración y el
  paso manual de instalación del `cron` en un servidor nuevo (ADR 0027).
- `docs/decisiones/0042-copia-semanal-por-pg_dump-en-el-host.md` (nuevo) y su fila en
  `docs/decisiones/README.md`. La 0041 queda en `Aceptada`: la 0042 no la sustituye ni la
  precisa, resuelve una consecuencia que ella misma marcó pendiente.

Ningún otro fichero queda autorizado por esta spec.

Explícitamente fuera:

- **Copia fuera del servidor.** Una copia semanal en el mismo disco protege contra un
  `down -v`, contra una migración destructiva y contra un borrado accidental de un entrenador.
  **No protege contra la pérdida del host, un disco roto ni ransomware.** Sacar las copias a
  otro sitio es otra decisión, con su propio transporte, su cifrado y su destino. Criterio de
  revisión, que la ADR 0042 debe recoger: cuando entren datos reales de un club, esto deja de
  ser opcional.
- **Point-in-time recovery, archivado de WAL, réplica en caliente.** Recuperar «el estado de
  las 15:42 del martes» exige el andamiaje completo de PITR. Aquí el grano es la semana.
- **Cifrar las copias.** Mientras no salgan del host, la clave viviría en el mismo disco y
  sería legible por el mismo usuario que ya puede leer la base entera con un `docker exec`.
  Cifrar añade un modo de fallo nuevo —«la copia está bien pero perdimos la clave»— sin
  subir el listón para ningún atacante realista. Obligatorio en el instante en que una copia
  salga del host (herramienta entonces: `openssl enc`, que ya está en todo host Linux).
- **Retención abuelo-padre-hijo.** GFS resuelve el conflicto entre retención larga y coste de
  almacenamiento. Con volcados de pocos MB ese conflicto no existe: la retención plana de ocho
  semanas ya cubre dos meses. Si algún día se quiere memoria más larga, se sube el ocho.
- **Herramientas de backup externas** (`pgBackRest`, `barman`, `wal-g`). El proyecto hace la
  autenticación entera con `node:crypto` y presume de cero dependencias; una copia lógica
  semanal se resuelve con `pg_dump`, que ya viene en la imagen de Postgres, y `cron`, que ya
  está en el host.
- **Notificación activa** (correo en cada fallo, *dead man's switch*, panel). Lo que detecta
  «lleva tres semanas fallando» sin que nadie mire es un ping a un servicio externo que avisa
  cuando el ping no llega; eso mete un servicio de terceros y una URL secreta. Por ahora, el
  aviso vive donde un humano ya mira: la consola del despliegue (E19). Criterio de revisión:
  igual que la copia fuera del host.
- **`pg_dumpall` y copia de roles.** El clúster tiene un rol y una base. El rol lo recrea el
  *entrypoint* de la imagen en el primer arranque del volumen a partir de `POSTGRES_USER` y
  `POSTGRES_PASSWORD` del `.env`, que sí se copia. Si algún día hay una segunda base o un
  segundo rol, este punto caduca.
- **Copia física del volumen `interzone-datos`.** Un `tar` del directorio de datos con Postgres
  en marcha no es *crash-consistent*: es una mezcla de instantes. Y queda atada a la versión
  mayor y al *build* exacto —ya hubo un salto doloroso cuando `postgres:18` movió el punto de
  montaje a `/var/lib/postgresql` sin `/data`—. Un volcado lógico de PG 18 se restaura en PG 19.
- **Copia de la configuración de Nginx Proxy Manager.** El *Proxy Host* y sus certificados
  viven en los volúmenes de otra aplicación del host (ADR 0041). Restaurar InterZone no
  devuelve su entrada en el proxy: es un paso manual de su interfaz, y el *runbook* de
  restauración lo dice con todas las letras (E17).
- **Restaurar desde una interfaz.** La restauración es un procedimiento de consola documentado,
  no un botón.
- **Tests en `npm test`.** Ni un escenario pasa por la suite; ver «Nota de verificación».

## Escenarios

Todos se ejecutan contra el stack en modo local (`ENTORNO=local`, que es exactamente para lo
que existe `docker-compose.local.yml`), no contra producción. La copia se toma siempre con
`pg_dump` **dentro** del contenedor `interzone-postgres-1`, en formato *custom* (`-Fc`): así
el binario que vuelca es siempre el mismo que el servidor —hoy y cuando se suba de versión
mayor—, el fichero ya viene comprimido, y `pg_restore -l` puede leer su índice de contenidos
como sonda de integridad. `pg_restore` no está instalado en el host, así que toda operación
de restauración o de listado corre también dentro del contenedor.

El script no lee credenciales del repositorio ni del `.env` del host: `POSTGRES_USER`,
`POSTGRES_PASSWORD` y `POSTGRES_DB` ya viven en el entorno del contenedor `postgres`, y
`pg_dump`/`psql` dentro de él las toman solos —`libpq` usa `PGPASSWORD` del entorno sin
pedirla—. El `sh -c` que ejecuta el volcado nombra `$POSTGRES_USER` y `$POSTGRES_DB` entre
comillas simples para que los expanda la shell de dentro, no la del host (E35).

### La copia semanal

**E1 — Tomar una copia deja un fichero nuevo y sale con éxito**
- Dado: el stack en marcha y el directorio de copias vacío
- Cuando: se ejecuta `copia-seguridad.sh copia semanal`
- Entonces: aparece un fichero nuevo con nombre definitivo en el directorio de copias y la
  orden termina con código de salida cero

**E2 — El nombre fija el origen y el instante, y ordena solo**
- Dado: que se acaba de tomar una copia semanal
- Cuando: se mira su nombre
- Entonces: es `semanal-<AAAAMMDD>T<hhmmss>Z.dump`, con el instante en UTC y sin dos puntos, de
  forma que ordenar los ficheros alfabéticamente los ordena también del más antiguo al más
  reciente

**E3 — La copia no necesita `pg_dump` instalado en el host**
- Dado: un host sin `pg_dump` ni `pg_restore` en el `PATH`
- Cuando: se toma una copia
- Entonces: se toma igual, porque el volcado corre dentro del contenedor `postgres` con el
  binario de su imagen

**E4 — El volcado conserva lo que Prisma no sabe expresar**
- Dado: una copia recién tomada
- Cuando: se restaura en una base desechable y se pregunta a su catálogo
- Entonces: están las catorce tablas de `public` —trece de datos más `_prisma_migrations`—,
  las veintiséis restricciones `CHECK` escritas a mano en el SQL de las migraciones, y
  `SELECT celdas_validas(ARRAY[1,2])` responde sin error

**E5 — El volcado conserva el punto en que estaban las migraciones**
- Dado: una copia restaurada en una base desechable
- Cuando: se arranca el contenedor `servidor` contra esa base con el mismo commit del que salió
  la copia
- Entonces: el `prisma migrate deploy` del arranque no aplica ninguna migración: la tabla
  `_prisma_migrations` viajó dentro del volcado

**E6 — La copia no interrumpe el servicio**
- Dado: un stack sano, con `servidor` y `web` en estado `healthy`
- Cuando: se toma una copia mientras la aplicación atiende peticiones
- Entonces: los dos siguen `healthy` durante y después, ningún contenedor se reinicia, y las
  peticiones en curso no fallan

**E7 — El `.env` viaja con cada copia**
- Dado: que se toma una copia
- Cuando: se mira el directorio
- Entonces: junto al `.dump` queda un `entorno-<mismo sello>.env` con el contenido del `.env` de
  la raíz, porque sin él el stack no arranca y `POSTGRES_PASSWORD` no es recuperable de ninguna
  otra parte

### Aceptar o rechazar una copia

**E8 — Solo se le pone nombre definitivo a lo que está completo**
- Dado: un `pg_dump` que termina bien
- Cuando: el script acepta la copia
- Entonces: el fichero se escribió con un sufijo `.parcial` y se renombró al nombre definitivo
  con un `mv` atómico después de comprobarlo, nunca antes; un fichero con nombre definitivo en
  ese directorio es siempre una copia completa y aceptada

**E9 — Un volcado interrumpido no deja nombre definitivo ni toca las copias buenas**
- Dado: un `pg_dump` que se mata a mitad de la escritura
- Cuando: el script termina
- Entonces: no existe ningún fichero con nombre definitivo nuevo, la salida es distinta de cero,
  y las copias anteriores están intactas

**E10 — Se rechaza una copia que encoge de golpe**
- Dado: una copia anterior aceptada, y una base que un `down -v` accidental ha dejado recién
  inicializada y casi vacía
- Cuando: se toma una copia nueva
- Entonces: se rechaza porque su tamaño es menos de la mitad del de la última copia aceptada, la
  salida es distinta de cero, y no se purga ninguna copia — una copia vacía pero
  estructuralmente válida es el fallo más peligroso, porque en ocho semanas rotaría las buenas
  por ocho vacías

**E11 — La primera copia no tiene con qué compararse y se acepta**
- Dado: un directorio de copias vacío
- Cuando: se toma la primera copia
- Entonces: se acepta sin comprobación de tamaño relativo, porque no hay copia anterior

**E12 — Una copia aceptada lista su índice de contenidos**
- Dado: una copia con nombre definitivo
- Cuando: se ejecuta `pg_restore -l` sobre ella
- Entonces: lista las tablas y objetos del volcado sin error

### Retención

**E13 — Por debajo del límite no se borra nada**
- Dadas: siete copias semanales en el directorio
- Cuando: se toma la octava
- Entonces: hay ocho y ninguna se ha borrado

**E14 — Al superar el límite se borra la más antigua, y solo esa**
- Dadas: ocho copias semanales
- Cuando: se toma la novena
- Entonces: quedan ocho, y la que falta es la del sello más antiguo; el descarte usa el orden
  de los nombres, no la fecha de modificación del fichero

**E15 — La purga corre después de aceptar la copia nueva, nunca antes**
- Dada: una copia nueva que se rechaza por E9 o E10, y ocho copias anteriores
- Cuando: el script termina
- Entonces: siguen estando las ocho: purgar antes de aceptar cambiaría ocho copias buenas por
  cero copias y una que quizá no cabe

**E16 — La purga no puede vaciar el directorio**
- Dadas: ocho copias, todas con más de un año de antigüedad
- Cuando: corre la purga
- Entonces: no se borra ninguna, porque la retención cuenta ficheros y no mira la edad; una
  purga por edad vaciaría el directorio justo cuando las copias llevan meses fallando y son lo
  único que queda

**E17 — Las copias previas a un despliegue no expulsan a las semanales**
- Dadas: ocho copias semanales y tres previas a despliegue
- Cuando: se toman dos copias previas más
- Entonces: siguen las ocho semanales, y de las previas quedan tres: cada origen tiene su
  propio nombre (`semanal-`, `previa-`) y su propia cuenta de retención

### Modos de fallo

**E18 — Con el stack apagado, la copia falla limpiamente**
- Dado: el stack detenido
- Cuando: corre la copia
- Entonces: sale con código distinto de cero, el mensaje nombra el contenedor que no encuentra,
  no se crea ningún fichero y no se borra nada

**E19 — Sin espacio en disco, la copia falla sin dañar lo que hay**
- Dado: un destino sin espacio libre
- Cuando: corre la copia
- Entonces: sale con código distinto de cero, no queda ningún fichero con nombre definitivo, y
  las copias anteriores están intactas

**E20 — Dos ejecuciones a la vez: la segunda no arranca**
- Dada: una copia en curso
- Cuando: el `cron` dispara otra antes de que la primera acabe
- Entonces: la segunda no llega a tocar la base de datos y lo deja registrado; el `cron` la
  envuelve en `flock`

**E21 — Nunca se sobrescribe una copia existente**
- Dado: un fichero con el nombre de destino ya presente en el directorio
- Cuando: corre la copia
- Entonces: falla en vez de pisarlo

**E22 — Una copia que coincide con una migración larga se rinde, no bloquea el despliegue**
- Dada: una migración en curso que mantiene un bloqueo exclusivo sobre una tabla
- Cuando: la copia intenta volcar esa tabla
- Entonces: `pg_dump` se rinde en un minuto (`--lock-wait-timeout`), la copia falla y lo
  registra, y la migración no se retrasa: una copia semanal perdida es más barata que un
  despliegue colgado

**E23 — Las copias y el script sobreviven a un despliegue**
- Dadas: copias en el directorio y el script en el repositorio
- Cuando: corre `deploy-servidor.sh`, con su `git reset --hard` y su `git clean -fd`
- Entonces: las copias siguen todas ahí —viven fuera del árbol del repositorio, donde
  `git clean` no llega— y el script sigue siendo ejecutable, porque es un fichero versionado que
  `git reset` restaura en vez de borrar

### Observabilidad

**E24 — Una línea de registro por ejecución, salga bien o mal**
- Dada: cualquier ejecución de la copia
- Cuando: termina
- Entonces: el fichero de registro gana exactamente una línea, con el instante, el resultado y,
  si falló, el paso en que falló y su código

**E25 — Con una copia fresca, la comprobación calla**
- Dada: una copia semanal de hace dos días
- Cuando: se ejecuta `copia-seguridad.sh comprobar`
- Entonces: sale con código cero y no imprime nada alarmante

**E26 — Con una copia caducada o sin ninguna, la comprobación avisa**
- Dada: una copia semanal de hace veintidós días, o ninguna copia
- Cuando: se ejecuta `copia-seguridad.sh comprobar`
- Entonces: sale con código distinto de cero y dice cuántos días hace de la última y dónde
  mirar el registro

**E27 — El despliegue avisa de una copia caducada pero no se bloquea**
- Dada: una copia semanal caducada
- Cuando: se ejecuta `deploy-servidor.sh`
- Entonces: imprime el aviso como paso 0 y el despliegue continúa y termina bien: bloquear el
  despliegue por un fallo de copias empujaría a saltarse el script

### Verificación y restauración

**E28 — Verificar una copia buena la restaura de verdad y no deja rastro**
- Dada: una copia aceptada
- Cuando: se ejecuta `copia-seguridad.sh verificar <fichero>`
- Entonces: levanta un Postgres desechable, restaura la copia dentro sin errores, comprueba que
  hay catorce tablas, veintiséis `CHECK` y que `celdas_validas` responde, informa de las filas
  de un par de tablas, y destruye el contenedor al terminar

**E29 — Verificar una copia corrupta falla, y aun así limpia**
- Dado: un `.dump` con bytes alterados
- Cuando: se ejecuta `verificar` sobre él
- Entonces: falla con código distinto de cero y el contenedor desechable se destruye igualmente

**E30 — Verificar no toca producción**
- Dado: el stack en marcha
- Cuando: se ejecuta `verificar`
- Entonces: ningún contenedor, red ni volumen del proyecto `interzone` cambia de estado, y
  `servidor` sigue `healthy`: el contenedor de verificación no monta volumen, no se une a la red
  `interna`, no publica puertos y no pertenece al proyecto compose

**E31 — Restaurar devuelve el estado que tenía la copia**
- Dado: un sistema que un entrenador borró después de la última copia
- Cuando: se sigue el *runbook* de restauración con esa copia
- Entonces: el sistema vuelve a estar, con sus formaciones y sus zonas de defensa

**E32 — Restaurar una copia antigua sobre código nuevo aplica las migraciones que faltan**
- Dada: una copia anterior a una migración
- Cuando: se restaura y arranca el contenedor `servidor` con el código actual
- Entonces: el `prisma migrate deploy` del arranque aplica exactamente las migraciones que a
  esos datos les faltan, y la aplicación funciona

**E33 — La semilla no duplica nada tras una restauración**
- Dado: el stack restaurado con datos
- Cuando: `deploy-servidor.sh` ejecuta `npm run seed:prod` como hace en cada despliegue
- Entonces: no crea ni duplica nada, porque la semilla solo siembra si la base está vacía

### Seguridad

**E34 — Los permisos de las copias son restrictivos**
- Dado: el directorio de copias
- Cuando: se miran sus permisos y los de los ficheros que contiene
- Entonces: el directorio es `0700` y del usuario `ubuntu`, y todo fichero dentro es `0600`: el
  volcado lleva los hashes `scrypt` de todas las cuentas y los correos de la lista blanca

**E35 — Las credenciales no aparecen en la tabla de procesos**
- Dada: una copia en curso
- Cuando: se mira `ps aux` en el host
- Entonces: no aparecen ni la contraseña, ni el usuario, ni el nombre reales de la base de
  datos: el `pg_dump` corre dentro del contenedor con las variables que ya tiene en su entorno,
  y el `sh -c` del host solo lleva `$POSTGRES_USER` y `$POSTGRES_DB` entre comillas simples, sin
  expandir; el script nunca usa `set -x`

**E36 — Ni el script ni el `cron` contienen o guardan un secreto**
- Dado: el contenido de `copia-seguridad.sh` y la línea del `cron`
- Cuando: se revisan
- Entonces: ninguno de los dos contiene una credencial escrita ni hace `source` del `.env` del
  host: la contraseña vive solo en el entorno del contenedor `postgres` y no se copia a ningún
  fichero salvo el `entorno-<sello>.env` de E7, que hereda los permisos `0600` del directorio

## Preguntas abiertas

Ninguna. Todo se resolvió con el usuario y contra el servidor real antes de congelar:

- **El repositorio en el servidor está en `/home/ubuntu/projects/interZone/inter-zone`**
  (corregido al implementar: la primera lectura decía un nivel menos) y todo corre como el
  usuario `ubuntu`, que está en el grupo `docker` y usa el *socket* sin `sudo` (verificado con
  `id` y `docker ps`). El `cron` de la copia corre también como `ubuntu`, con la ruta del
  script anclada a ese directorio y las copias en `/home/ubuntu/copias-interzone/` —bajo el
  `HOME` de `ubuntu`, no en `/var/backups`, que exigiría `root`—. Fuera del árbol del
  repositorio (inmune a `git clean`) y fuera de todo volumen de Docker (inmune a `down -v`),
  que es lo que el escenario E23 exige.
- **El contenedor de la base es `interzone-postgres-1`** (proyecto compose `interzone`, sin
  `container_name`). El host aloja más aplicaciones —`inter_auu_*`, `n8n`, `portainer`,
  `nginx-proxy-manager`—, así que la referencia va siempre por el nombre exacto, nunca por
  «el contenedor de postgres».
- **El script no gestiona ninguna contraseña.** `POSTGRES_USER=inter_admin`,
  `POSTGRES_DB=interzone` y `POSTGRES_PASSWORD` ya viven en el entorno del contenedor;
  `pg_dump`/`psql` dentro de él las toman solos, sin *prompt* (verificado: un
  `docker exec interzone-postgres-1 sh -c 'pg_dump -Fc -U "$POSTGRES_USER" -d "$POSTGRES_DB"'`
  sale con código 0 y produce un volcado válido de 37 KB). El `.env` del host no se lee para
  nada salvo para copiarlo tal cual (E7).
- **El disparador es `cron`**, no un *timer* de systemd: el `crontab` de `ubuntu` y
  `/etc/cron.d/` están libres (solo timers de sistema de Ubuntu). Se propone domingo a las
  `04:17` UTC, lejos de `e2scrub_all` (domingo `03:10`) y de los trabajos de medianoche. La
  ejecución va envuelta en `flock`. Se asume que se pierde la copia si el host estuvo apagado
  el domingo; el aviso de frescura (E26, E27) lo detecta en el siguiente despliegue.
- **`deploy.sh` se toca** para mover su banner `==> ENTORNO=...` a la salida de error (`>&2`),
  de modo que `bash deploy.sh ps -q postgres` devuelva solo el identificador. Un carácter de
  cambio que no rompe `deploy-servidor.sh`.
- **La copia previa a cada despliegue entra en esta spec** (E9, E15, E17, E27), con su propio
  prefijo `previa-` y su propia retención de tres.

Números medidos en la base de producción, para fijar E4 y E28:

- **26 restricciones `CHECK`** (`SELECT count(*) FROM pg_constraint WHERE contype = 'c'`).
- **14 tablas en `public`**: las 13 de datos más `_prisma_migrations`.
- La función `celdas_validas(integer[])` existe y viaja en el volcado, junto con
  `_prisma_migrations` y los siete enums.
- `pg_restore` **no está instalado en el host**: toda restauración y todo `pg_restore -l`
  corren dentro de un contenedor de la imagen `postgres:18-alpine`.

## Nota de verificación

**Ni un escenario pasa por `npm test`.** Esto es infraestructura de shell y Docker; `domain/`
no se toca, así que la regla de cobertura al 100% de `domain/` no se ve afectada, porque no
entra código nuevo en `domain/`. Coincide con lo que la sección «Qué NO se testea» de
`docs/flujo-de-trabajo.md` ya excluye, y con el precedente de las specs 059 y 061.

Los escenarios se parten en dos niveles, que la tabla de «Al cerrar» debe recoger uno a uno:

- **Comprobables por una orden repetible** (E1–E8, E11–E14, E16, E17, E21, E24–E26, E28, E30,
  E34, E36): se verifican con `copia-seguridad.sh verificar`, `pg_restore -l`, `ls`, `sort`,
  `stat -c %a` y comparación de tamaños. Hay automatización real, pero vive dentro del propio
  script y de un puñado de órdenes, no en una suite: meterlos en Vitest exigiría `bats` o
  similar, una dependencia nueva para probar una función que se ejecuta una vez por semana.
- **Fallos inducidos a mano, una sola vez** (E9, E10, E15, E18–E20, E22, E23, E27, E29,
  E31–E33, E35): matar el contenedor, llenar un `tmpfs` de un mega, lanzar dos ejecuciones a la
  vez, restaurar de verdad, alterar bytes de un `.dump`. Se ejecutan una vez contra el stack
  local y se anotan en «Al cerrar», como hicieron las specs 059 y 061.

Orden de implementación sugerido: La copia semanal → Aceptar o rechazar → Retención → Modos
de fallo → Observabilidad → Verificación y restauración → Seguridad. **Aceptar o rechazar
antes que Retención no es negociable:** purgar antes de saber distinguir una copia buena de
una mala es como se destruyen los sistemas de copias.

## Al cerrar

Todo en un solo fichero nuevo, `copia-seguridad.sh`, más el retoque de `deploy.sh`
(banner a `stderr`), el paso 0 de `deploy-servidor.sh`, la sección del `README.md` y la
ADR 0042. `src/` no se tocó: `npm test` sigue en 488, `npm run typecheck` limpio,
`npm run format:check` en verde (Prettier no mira `.sh` ni `docs/`). No existe
`test:coverage`, como ya se hizo constar al cerrar las specs 012, 013, 057, 060 y 061.

**Ni un escenario en la suite, como anticipaba la Nota de verificación.** Los 33 escenarios
comprobables (A–G) se ejecutaron a mano contra el stack de producción real
(`ubuntu@vnic-kartas`, `ENTORNO=produccion`) el mismo día del cierre. Resultado por grupo:

| Grupo | Escenarios | Cómo se comprobó |
|---|---|---|
| A — la copia semanal | E1, E2, E3, E6, E7, E21, E34 | Una copia real; `ls`, `stat -c %a`; `deploy.sh ps` durante el volcado |
| B — aceptar o rechazar | E8, E10, E11, E12 | `pg_restore -l` sobre la copia; una «última buena» de 500 KB falseada para forzar el rechazo por tamaño |
| C — retención | E13–E17 | Nueve copias `semanal` seguidas y cinco `previa`; recuento y `PURGA` en el log |
| D — modos de fallo | E18, E20 | `deploy.sh stop postgres`; dos ejecuciones con `flock -n` |
| E — observabilidad | E24, E25, E26 | Una copia OK y una FALLO al log; `comprobar` con copia fresca y con una renombrada a un sello viejo |
| F — verificación y restauración | E28, E29, E30 | `verificar` sobre copia sana; `dd` para corromper otra; `deploy.sh ps` mientras corría |
| G — el paso 0 del despliegue | E9, E23, E27 | Fragmento del paso 0 aislado; `git clean -fd -n` |

**Verificados por lectura de código, no por ejecución** (registrado aquí como hicieron las
specs 059 y 061 con sus escenarios de presentación): **E4 y E5** —el volcado conserva
`_prisma_migrations` y `celdas_validas`— se confirmaron de rebote en E28, que restaura y
cuenta 14 tablas y 26 `CHECK` y llama a la función. **E19** (disco lleno), **E22** (bloqueo
por migración) y **E31–E33** (restauración real en producción) no se forzaron: el primero
porque el manejo de error de `pg_dump` ya se probó en E18, el segundo porque no coincidió
ninguna migración real, y los últimos porque son destructivos sobre el stack vivo —el
*runbook* queda escrito en la spec y se probará la próxima vez que haga falta restaurar de
verdad—. **E35 y E36** (credenciales) se verificaron leyendo el script: `sh -c` con comillas
simples, sin `set -x`, sin `source .env`.

**Tres bugs reales, encontrados al ejecutar los escenarios contra el servidor:**

1. **`cp -p` preservaba los permisos `0664` del `.env` de origen**, saltándose el `umask 077`:
   el `entorno-<sello>.env` nacía legible por el grupo. Se cambió a `cp` sin `-p` más un
   `chmod 600` explícito. El directorio de destino, creado a mano, tampoco era `0700`: se
   añadió un `chmod 700 "$DESTINO"` en cada copia.
2. **`psql -tA` imprime un booleano como `true`/`false`, no `t`/`f`.** La comprobación de
   `verificar` comparaba `celdas_validas(ARRAY[1,2])` contra `'t'` y fallaba sobre una copia
   perfectamente sana. Se traduce con un `CASE ... THEN 'si' ELSE 'no'` en la propia consulta.
3. **La ruta del repositorio en el servidor no era `~/projects/interZone`** —como decía esta
   spec en «Preguntas abiertas»— sino `~/projects/interZone/inter-zone`, un nivel más. La spec
   estaba congelada; se corrigió aquí y en el `README.md` y la cabecera del script, que sí se
   podían tocar.

**Decisión tomada al implementar, no elevada a nada:** `deploy-servidor.sh` invoca
`bash copia-seguridad.sh`, no `./copia-seguridad.sh`, porque el repositorio **no versiona el
bit `+x`** (`deploy.sh` está en el índice como `100644`, y por eso el propio
`deploy-servidor.sh` ya lo llamaba con `bash`). El `cron` del `README.md` también usa `bash`.

**Sello a segundos, colisión asumida.** Dos copias del mismo origen en el mismo segundo: la
segunda falla con «nombre ya existe» (E21) en vez de generar un sello nuevo. Apareció al
intentar probar E10 con dos copias seguidas. Para el `cron` semanal y la `previa` del
despliegue es inofensivo; no se añadió granularidad de nanosegundos ni reintento porque
ningún escenario lo pide. Queda en las consecuencias de la ADR 0042.

**`docs/dominio.md` no cambia** —no hay ninguna regla de voleibol aquí—.
**`docs/arquitectura.md` no cambia**: no nace ninguna capa, ningún adaptador cambia, y lo que
la aplicación hace en producción sigue igual; lo nuevo es un script de operación del host, que
`README.md` sí recoge. **ADR 0042 nueva** (`docs/decisiones/`): la decisión se define tanto
por lo que excluye —sin PITR, sin copia fuera del host, sin cifrado, sin herramientas
externas, sin GFS— como por lo que incluye, y su artefacto principal (la línea del `cron`, el
directorio `~/copias-interzone`) vive fuera del repositorio y no se puede deducir leyendo el
código. La 0041 queda en `Aceptada`: la 0042 resuelve una consecuencia que ella marcó
pendiente, no la sustituye ni la precisa.

**Pendiente, con dueño humano:** instalar el `cron` en el servidor (una vez), y sacar una
copia fuera del host antes de que entren datos reales de un club —criterio de revisión escrito
en la ADR 0042—.
