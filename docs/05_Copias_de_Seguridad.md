# 05 — Copias de seguridad

> Documento de lectura. El diseño y sus 36 escenarios están en
> `docs/especificaciones/062-copias-de-seguridad-del-servidor.md`; el porqué de cada decisión
> y de cada exclusión, en `docs/decisiones/0042-copia-semanal-por-pg_dump-en-el-host.md`; el
> código ejecutable, en `copia-seguridad.sh` en la raíz del repositorio.

---

## 1. Qué protege esto, y qué no

Toda la persistencia de InterZone vive en una sola base de datos PostgreSQL dentro de un
volumen de Docker. El servicio `servidor` no escribe nada a disco. Perder ese volumen
—`docker compose down -v`, una migración que sale mal, un entrenador que borra el sistema
equivocado— significa perderlo todo, porque hasta la spec 062 no existía ninguna copia (la
ADR 0041 lo dejó escrito como deuda pendiente).

**La copia semanal protege contra:**

- Un `docker compose down -v` accidental.
- Una migración destructiva.
- Un entrenador que borra o corrompe un sistema y se da cuenta días después.

**NO protege contra** (queda fuera a propósito, con criterio de revisión en la ADR 0042):

- La pérdida del host, un disco roto o ransomware. Todo vive en el mismo disco. Sacar una
  copia fuera del servidor es otra decisión —transporte, cifrado, destino— y **deja de ser
  opcional cuando entren datos reales de un club**.
- Un fallo silencioso prolongado. Si nadie despliega durante semanas, un `cron` que ha dejado
  de ejecutarse no avisa a nadie. El aviso de frescura solo se ve en la consola del
  despliegue.
- Recuperar un instante concreto (point-in-time recovery). El grano es la semana.

---

## 2. Qué se guarda y cómo

Un **volcado lógico** con `pg_dump -Fc` (formato *custom*), ejecutado **dentro del contenedor
`interzone-postgres-1`**. No es una copia del directorio de datos. Esa elección tiene
consecuencias que importan:

- **El binario que vuelca es siempre el mismo que el servidor**, hoy y cuando se suba de
  versión mayor. Un volcado de Postgres 18 se restaura en Postgres 19; una copia física del
  directorio de datos de PG 18, no (ya hubo un salto doloroso cuando PG 18 movió el punto de
  montaje a `/var/lib/postgresql` sin `/data`).
- **Arrastra lo que Prisma no sabe expresar**: las 26 restricciones `CHECK` escritas a mano en
  el SQL de las migraciones, la función `celdas_validas(integer[])` y la tabla
  `_prisma_migrations`. Es la única representación completa del esquema real fuera del
  servidor.
- **El formato *custom* ya viene comprimido** —nada de `.gz`— y `pg_restore -l` lee su índice
  de contenidos como prueba de integridad de coste cero.
- **El script no lee ninguna credencial.** `pg_dump` corre donde `POSTGRES_PASSWORD` ya vive,
  en el entorno del contenedor. En `ps` del host no aparece ni el usuario ni el nombre de la
  base.

Junto a cada volcado se guarda una copia del `.env` de la raíz (`entorno-<sello>.env`). Sin él
el stack no arranca y la contraseña de la base no se recupera de ningún otro sitio.

### Dónde viven las copias

`/home/ubuntu/copias-interzone/`, en el `HOME` del usuario del despliegue. **Fuera del árbol
del repositorio** (inmune a `git clean -fd`, que hace `deploy-servidor.sh`) y **fuera de todo
volumen de Docker** (inmune a `down -v`). El directorio es `0700`; cada fichero, `0600` —el
volcado lleva los hashes `scrypt` de todas las cuentas y los correos de la lista blanca—.

Nombres: `semanal-20260831T041703Z.dump`. Sello ISO en UTC, sin dos puntos. **El orden
alfabético de los nombres es el orden cronológico**, y de ahí sale la rotación sin depender de
la fecha de modificación del fichero ni del reloj del host.

---

## 3. El ciclo semanal

Un `cron` del usuario `ubuntu` —**instalado a mano una sola vez**, no vive en el repositorio—
dispara la copia el domingo a las 04:17 UTC, envuelto en `flock` para que dos ejecuciones
nunca se solapen:

```cron
17 4 * * 0  flock -n /tmp/interzone-copia.lock bash /home/ubuntu/projects/interZone/inter-zone/copia-seguridad.sh copia semanal >> /home/ubuntu/copias-interzone/copia.log 2>&1
```

Cada ejecución hace, en este orden:

1. Vuelca la base a un fichero `.parcial`.
2. **Lo rechaza si ha encogido** a menos de la mitad de la última copia buena —una base recién
   vaciada por accidente produciría un volcado válido pero casi vacío que, en ocho semanas,
   rotaría fuera todas las copias buenas—. La primera copia no tiene con qué compararse y se
   acepta.
3. Solo entonces le da nombre definitivo con un `mv` atómico. **Un fichero con nombre
   definitivo es siempre una copia completa y aceptada.**
4. Copia el `.env` a su lado.
5. **Purga las copias que sobran** —después de aceptar la nueva, nunca antes: purgar primero
   cambiaría ocho copias buenas por cero copias y una que quizá no cabe—.
6. Escribe una línea en `copia.log`.

### Por qué `cron` del host y no otra cosa

- **No un servicio en `docker-compose.prod.yml`:** exigiría montar `/var/run/docker.sock`
  (root del host en un contenedor, inaceptable en un stack cuyo `servidor` corre como
  `USER node`), y `deploy.sh down` pararía las copias en silencio.
- **No un *timer* de systemd:** tiene una ventaja real (`Persistent=true` recupera la
  ejecución perdida si el host estuvo apagado el domingo) pero cuesta dos ficheros y un
  `daemon-reload`. Si algún día se prefiere, el script no cambia ni una línea.

---

## 4. Retención

Por **número de ficheros, nunca por antigüedad**. Purgar por edad (`find -mtime +N -delete`)
vaciaría el directorio justo cuando las copias llevan semanas fallando y son lo único que
queda; contando ficheros es imposible bajar del límite.

| Origen | Se guardan | Cubre | Cuándo se toma |
|---|---|---|---|
| `semanal-` | 8 | ~2 meses. El tiempo que tarda en notarse que falta el sistema que se preparó en pretemporada. | Cada domingo, por el `cron`. |
| `previa-` | 3 | El momento más peligroso de la semana: reconstruir y migrar. | Al principio de cada `deploy-servidor.sh` (paso 0). |

Cada origen rota por separado: las copias previas a un despliegue no expulsan la historia
semanal. El volcado ocupa ~37 KB, así que 8 + 3 copias caben de sobra —el número 8 sale del
modo de descubrimiento típico, no del coste de almacenamiento—.

`deploy-servidor.sh` gana además un paso 0 que **avisa —sin bloquear— si la última copia
semanal no está fresca**. Bloquear el despliegue por un fallo de copias empujaría a saltarse
el script.

---

## 5. Los tres subcomandos

Se invocan con `bash` (el repositorio no versiona el bit `+x`, igual que `deploy.sh`):

| Subcomando | Qué hace |
|---|---|
| `bash copia-seguridad.sh copia [semanal\|previa]` | Toma un volcado, lo acepta o lo rechaza, y rota. Es lo que llama el `cron`. |
| `bash copia-seguridad.sh comprobar` | ¿Hay una copia semanal de ≤8 días y legible? Devuelve un código de salida, sin ruido si todo va bien. Es lo que revisa el despliegue. |
| `bash copia-seguridad.sh verificar <fichero>` | Restaura la copia **de verdad** en un Postgres desechable —sin volumen, sin red, sin puertos, fuera del proyecto compose— y comprueba 14 tablas, 26 `CHECK` y `celdas_validas`. No puede tocar producción. |

---

## 6. Comprobar que funciona

### Ahora mismo, sin esperar al domingo

```bash
cd ~/projects/interZone/inter-zone

# Toma una copia y compruébala de verdad
bash copia-seguridad.sh copia semanal
COPIA=$(ls -1 ~/copias-interzone/semanal-*.dump | sort | tail -n1)
bash copia-seguridad.sh verificar "$COPIA"
```

Respuesta esperada:

```
VERIFICADA semanal-…Z.dump — 14 tablas, 26 CHECK, celdas_validas OK, N sistemas, M usuarios
```

Si se acaba de crear un sistema en la pizarra, el recuento de `sistemas` debe haber subido:
esa copia ya lo contiene.

### Que se está lanzando semana a semana

El indicador es el fichero de registro. Cada domingo gana una línea:

```bash
tail -5 ~/copias-interzone/copia.log
```

| Línea del log | Significa |
|---|---|
| `... OK semanal-…Z.dump 37575 B` | La copia se tomó y se aceptó. |
| `... FALLO paso=pg_dump ...` | El volcado falló. El `paso=` dice dónde: contenedor parado, disco lleno, bloqueo de migración. |
| `... PURGA semanal-…Z.dump` | Se borró la copia más antigua al pasar de 8. Normal. |
| `... FALLO paso=tamano ...` | Se rechazó una copia que encogió de golpe. Investigar la base. |

Comprobación rápida con código de salida:

```bash
bash ~/projects/interZone/inter-zone/copia-seguridad.sh comprobar ; echo $?
# 0    → hay copia de ≤8 días y es legible
# ≠0   → lleva sin correr más de 8 días, o la copia está corrupta
```

El próximo `deploy-servidor.sh` también avisa en su primera línea
(`==> 0/5  Copias de seguridad`) si la última no está fresca.

---

## 7. Restaurar

**El orden importa.** Comprueba la copia antes de destruir nada, guarda el estado actual, y
solo entonces restaura. **Nunca restaures una copia más nueva que el código desplegado**
—`prisma migrate deploy` encontraría en `_prisma_migrations` migraciones que no existen en el
código y avisaría de deriva—.

```bash
cd ~/projects/interZone/inter-zone
COPIA=~/copias-interzone/semanal-AAAAMMDDTHHMMSSZ.dump

# 0 · confirma que esa copia es restaurable (no toca producción)
bash copia-seguridad.sh verificar "$COPIA"

# 1 · copia de lo que hay AHORA
bash copia-seguridad.sh copia previa

# 2 · calla a los escritores; postgres sigue en pie
bash deploy.sh stop web servidor

# 3 · recrea la base vacía desde la base de mantenimiento `postgres`
ID=$(bash deploy.sh ps -q postgres)
docker exec -i "$ID" sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres \
  -c "DROP DATABASE IF EXISTS \"$POSTGRES_DB\" WITH (FORCE)" \
  -c "CREATE DATABASE \"$POSTGRES_DB\" OWNER \"$POSTGRES_USER\""'

# 4 · restaura. --exit-on-error: una restauración a medias no pasa por buena
docker exec -i "$ID" sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --no-owner --no-privileges --exit-on-error' < "$COPIA"

# 5 · levanta. El arranque del contenedor `servidor` corre `prisma migrate deploy`:
#     no-op si el código coincide con la copia, aplica lo que falte si es posterior
bash deploy.sh up -d servidor web
bash deploy.sh ps
```

Cuatro cosas que el procedimiento no resuelve solo:

- **Si también se perdió el `.env`**, restaura primero `entorno-<sello>.env` como `.env`,
  *antes* del paso 3. Con otra `POSTGRES_PASSWORD`, el volumen nuevo se inicializa con un rol
  distinto y nada autentica.
- **La semilla** (`npm run seed:prod`, que corre `deploy-servidor.sh`) es idempotente: solo
  siembra si la base está vacía. Tras una restauración no hace nada. No hay que evitarla.
- **Si el desastre incluyó el host**, tras levantar el stack hay que recrear a mano el
  *Proxy Host* en Nginx Proxy Manager apuntando a `interzone-web:80`. Esa configuración no
  está en el repositorio ni en estas copias.
- **`pg_restore` no está instalado en el host.** Todo lo de arriba corre dentro del contenedor
  a propósito.

---

## 8. Instalar en un servidor nuevo

El script se despliega con el código (`git pull`). El `cron` y el directorio de copias, no
—hay que crearlos a mano, una vez—:

```bash
cd ~/projects/interZone/inter-zone
mkdir -p ~/copias-interzone
crontab -e
# añadir la línea de la sección 3, guardar
crontab -l                       # comprobar que quedó
```

Requisitos ya cumplidos en el servidor actual: el usuario `ubuntu` está en el grupo `docker`
(usa el *socket* sin `sudo`), y `pg_dump`/`psql` dentro del contenedor toman las credenciales
de su propio entorno.
