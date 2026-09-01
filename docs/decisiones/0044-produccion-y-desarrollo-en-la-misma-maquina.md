# 0044 — Producción y desarrollo en la misma máquina

**Estado:** Aceptada

## Contexto

Hasta ahora existía un único despliegue: el servidor sincronizaba `origin/develop`
(`deploy-servidor.sh`) sobre un único clon, un único proyecto Compose (`interzone`) y una
única base de datos. No había ningún sitio para probar un cambio sin tocar los datos reales
de los entrenadores, ni para dejar la app abierta a que gente ajena entre a probarla sin
mezclar esas pruebas con el uso real.

Se decide separar en dos despliegues completos e independientes en el mismo servidor,
detrás del mismo Nginx Proxy Manager:

| | Producción | Desarrollo |
|---|---|---|
| URL | `cvinterzone.duckdns.org` | `devcvinterzone.duckdns.org` |
| Rama | `main` | `develop` |
| Base de datos | la actual, con datos reales | nueva, vacía + `seed:prod` |
| Copias de seguridad | sí (ADR 0042, sin cambios) | no |

## Decisión

1. **Un solo `docker-compose.prod.yml` para los dos entornos.** Lo que distingue producción
   de desarrollo vive por completo en el `.env` de cada clon (`PROYECTO_COMPOSE`, `ALIAS_WEB`,
   `ENTORNO_APP`, `RAMA_DESPLIEGUE`, `COPIAS_DE_SEGURIDAD`), nunca en un fichero de Compose
   aparte. Evita mantener dos ficheros que solo deberían diferir en un puñado de valores.
2. **Dos clones separados en disco** (`inter-zone` e `inter-zone-dev`), no *worktrees* sobre
   un único `.git`. `deploy-servidor.sh` hace `git reset --hard` + `git clean -fd`: con
   *worktrees* compartiendo objetos, un `fetch` en un lado y una limpieza agresiva en el otro
   son más fáciles de hacer mal que dos clones independientes, y la diferencia de espacio en
   disco no importa aquí.
3. **Identidad de contenedores por `PROYECTO_COMPOSE`.** El proyecto de producción **se queda
   con el nombre `interzone`**, el que ya tiene hoy: Compose deriva el nombre del volumen del
   nombre del proyecto (`interzone_interzone-datos`), y cambiarlo habría creado un volumen
   nuevo y vacío en el primer `up`. El de desarrollo pasa a ser `interzone-dev`.
4. **Se invierten los roles de las ramas.** `develop` deja de ser la rama que despliega el
   servidor único y pasa a desplegar **desarrollo**; `main` pasa a desplegar **producción**.
   Como ambas apuntaban al mismo commit en el momento de este cambio, la inversión no mueve
   ninguna línea de código desplegado. El flujo de trabajo se invierte a la vez
   (`CLAUDE.md`): las ramas de trabajo salen de `develop` y vuelven a `develop` por
   `--ff-only`; publicar en producción es un `--ff-only` de `develop` a `main`.
5. **La base de desarrollo nace vacía y sembrada** (`npm run seed:prod`), igual que un
   despliegue nuevo cualquiera — nunca restaurada desde una copia de producción. Es un
   entorno abierto a que cualquiera entre a probar; no tiene sentido que contenga cuentas o
   datos reales de nadie.
6. **Desarrollo no tiene copias de seguridad.** `COPIAS_DE_SEGURIDAD=no` en su `.env` hace que
   `copia-seguridad.sh` se niegue a actuar sobre ese clon (`copia` y `comprobar`; `verificar`
   sigue disponible porque no toca el stack en marcha). Si algo se rompe, se reconstruye desde
   cero con `deploy-servidor.sh`, que siembra el catálogo base de nuevo.
7. **Distintivos de desarrollo, parametrizados en el build de `web` por `ENTORNO_APP`:**
   manifiesto PWA con nombre propio ("InterZone (dev)"), `<title>` distinto, un `robots.txt`
   que bloquea la indexación, y una banda visible "Entorno de desarrollo" en la interfaz
   (`src/app/app.html`, controlada por la constante `ES_DESARROLLO` de `src/app/entorno.ts`,
   que esbuild resuelve en compilación vía la opción `define` de `angular.json`).

## Consecuencias

- `src/app/app.html`, `src/app/app.ts`, `src/app/app.css` y el nuevo `src/app/entorno.ts` se
  tocan fuera del protocolo de specs de `CLAUDE.md` — es trabajo de infraestructura visual, no
  de dominio, y queda constancia aquí de que es a propósito y decisión explícita del usuario.
- El `@if (esDesarrollo)` de `app.html` es una plantilla condicional, no una constante de
  compilación: Angular la evalúa en tiempo de ejecución, así que su función de renderizado
  (con el texto "Entorno de desarrollo") acaba en el bundle de **los dos** entornos, aunque
  `ES_DESARROLLO` valga `false` y nunca se ejecute en producción. Es una diferencia de unos
  pocos bytes, no de comportamiento — comprobado inspeccionando el bundle de producción tras
  el build.
- `PROYECTO_COMPOSE` en el `.env` de producción es ahora una variable en la que un valor
  erróneo pierde datos en el primer `up` (crea un volumen nuevo). Se documenta con una
  advertencia explícita en `docker-compose.prod.yml` y en `.env.produccion.example`.
- `copia-seguridad.sh` deriva el nombre del contenedor de `PROYECTO_COMPOSE` en vez de tenerlo
  fijo a `interzone-postgres-1`. En producción el comportamiento no cambia (mismo valor por
  defecto); `INTERZONE_POSTGRES` sigue mandando por encima si algún día hiciera falta.
- Dos *stacks* de Docker corriendo a la vez en el mismo servidor: dos compilaciones de Angular
  y dos Postgres. No se ha medido el consumo conjunto; el primer despliegue simultáneo es la
  primera vez que se comprueba que el servidor lo soporta.
- Dos dominios en Nginx Proxy Manager, configurados a mano en su UI (como ya lo estaba el
  primero) — esta parte sigue sin vivir en el repositorio ni en ninguna copia.
- Las cookies de sesión no llevan atributo `Domain` (`server/src/http/auth.rutas.ts`): son
  *host-only* por construcción, así que una sesión abierta en un dominio nunca es válida en el
  otro. No hizo falta ningún cambio para que esto fuera así.

## Alternativas descartadas

- **Un `docker-compose.prod.yml` y un `docker-compose.dev.yml` separados**: más fácil de leer
  a primera vista, pero cualquier cambio futuro al *stack* (una variable de entorno nueva, un
  healthcheck distinto) habría que aplicarlo dos veces y mantenerlos sincronizados a mano. Con
  un único fichero parametrizado por `.env`, un cambio de infraestructura se escribe una vez.
- **`git worktree` en vez de dos clones**: ver punto 2 de la decisión.
- **Restaurar producción en desarrollo** para probar con datos realistas: se descarta por
  exponer cuentas y datos reales de entrenadores en un entorno abierto a cualquiera. Si algún
  día hace falta, es una operación manual y puntual, no el estado por defecto del entorno.
