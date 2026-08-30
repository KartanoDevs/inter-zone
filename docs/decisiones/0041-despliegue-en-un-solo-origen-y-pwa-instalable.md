# 0041 — Despliegue en un solo origen y PWA instalable

**Estado:** Aceptada

## Contexto

La v2 (ADR 0023, ADR 0036) ya cierra el backend, las cuentas y la sesión. El disparador que
la ADR 0036 documentaba —"los jugadores quieren consultar los sistemas desde su casa"— exige
ahora ponerlo en un servidor real, uno que ya aloja otras aplicaciones en Docker detrás de
Nginx Proxy Manager (proxy inverso en contenedor, red Docker compartida
`nginx-proxy-network`, TLS gestionado por su propia UI en el puerto 81 — no hay Traefik ni
config manual de nginx en el host).

No existía ningún Dockerfile en el repo. El frontend tenía `URL_API` cableada a
`http://localhost:3000/api` y ningún rastro de PWA salvo los 9 iconos de `public/icons/`,
huérfanos desde hacía meses.

## Decisión

1. **Mismo origen.** Un contenedor `web` (nginx) sirve el build de Angular y hace
   `proxy_pass` de `/api` al contenedor `servidor`. `URL_API` pasa de una URL absoluta a
   `'/api'`. Consecuencia directa: CORS queda inerte y la cookie de sesión es de primera
   parte — necesario en Safari/iOS, que bloquea cookies de terceros y hace inservible una
   PWA instalada que dependa de ellas.
2. **El servidor se ejecuta con `tsx` en producción**, igual que en desarrollo. No se
   compila a JavaScript. El generador de Prisma en uso (`prisma-client`, no
   `prisma-client-js`) emite el cliente como TypeScript con imports sin extensión
   (`from "./enums"`); compilar exigiría migrar `moduleResolution` de `bundler` a
   `nodenext` y reescribir a mano los 15 imports del dominio compartido con Angular. Se
   prefiere enviar `tsx` y la CLI de `prisma` (ya son devDependencies necesarias en
   runtime para `migrate deploy`) antes que esa migración.
3. **Migraciones con `prisma migrate deploy` al arrancar el contenedor**, no como paso de
   despliegue aparte. Es idempotente, no interactivo, y respeta los `CHECK` y la función
   `celdas_validas()` escritos a mano en el SQL (`db push` los perdería).
4. **La app es instalable, no offline.** `public/manifest.webmanifest` + los iconos
   existentes + un service worker de ~20 líneas escrito a mano (`public/sw.js`) que solo
   cachea una página de cortesía sin conexión (`public/offline.html`) y nunca los bundles.
   Precisa la exclusión de README.md y `docs/01_Finalidad_y_Alcance.md` ("PWA offline y
   sincronización sin conexión" fuera a propósito): instalable ≠ offline con
   sincronización. La app instalada sigue necesitando red para ver datos.

## Consecuencias

- `app.config.ts` (línea de `URL_API`) y `src/index.html` (meta tags de PWA) se tocan fuera
  del protocolo de specs de `CLAUDE.md` — es trabajo de infraestructura, no de dominio, y
  queda constancia aquí de que es a propósito.
- `ng serve` necesita `--proxy-config proxy.conf.json` desde este cambio (script `start` en
  `package.json`), porque `URL_API` relativa no resuelve nada en `:4200` sin él.
- Probar el stack de producción en local también necesitaba algo más que `docker compose -f
  docker-compose.prod.yml up`: `web` no publica ningún puerto (a propósito, todo entra por el
  proxy real) y su red `proxy` es externa (a propósito, es la de Nginx Proxy Manager, que no
  existe fuera del servidor). `docker-compose.local.yml` es un override que solo añade eso
  dos cosas para local — publica el puerto de `web` y sustituye esa red externa por una que
  el propio compose crea y gestiona — y `deploy.sh` decide si aplicarlo leyendo `ENTORNO` de
  `.env`, para no tener que acordarse de añadir el `-f` a mano ni tocar
  `docker-compose.prod.yml` para probar.
- El healthcheck de `servidor` en `docker-compose.prod.yml` usa `GET /api/auth/quien-soy`,
  no `GET /api/sistemas`: se probó en local y ese segundo endpoint exige la fila de `equipo`
  que crea la semilla, que se ejecuta *después* del primer `up` — con `depends_on:
  service_healthy`, `servidor` nunca se habría declarado sano en un despliegue nuevo y `web`
  jamás habría arrancado.
- `GET /api/sistemas` sigue sin exigir sesión ni filtrar por rol (`docs/arquitectura.md`,
  `README.md`) — esto **no** es parte de lo que cerraba la spec 037 (que protegió solo la
  escritura), y no tiene spec asignada. Se despliega así, a sabiendas: cualquiera que
  conozca el dominio puede leer el catálogo completo de ambos equipos, borradores incluidos.
- No hay copia de seguridad automática del volumen de Postgres en este cambio. Un
  `docker compose down -v` borra el trabajo de los entrenadores. Queda pendiente decidir un
  `pg_dump` programado antes de meter datos reales de un club.
- Las fuentes (Inter, Orbitron) se siguen cargando de `fonts.googleapis.com`: sin red, la
  PWA instalada pierde la tipografía de todos los títulos. Autoalojarlas queda fuera de este
  cambio, pendiente de decisión aparte (implica traer binarios `.woff2` al repo).

## Alternativas descartadas

- **Dominios separados (`app.` / `api.`)**: exige `SameSite=None; Secure` en la cookie de
  sesión (hoy cableada a `Lax`) y CORS con origen explícito. Peor en Safari/iOS, que es
  justo la plataforma que más le importa a una PWA instalable para consultar desde el móvil.
- **Compilar el servidor a JavaScript**: descartado por el punto 2 de la decisión — el coste
  es una migración completa de resolución de módulos para ahorrar ~150 MB de imagen.
- **`@angular/service-worker`**: dependencia nueva, exige tocar `angular.json` y
  `app.config.ts`, y su precacheo agresivo de todos los bundles es exactamente el modo
  offline que este proyecto excluye a propósito. Un service worker escrito a mano de 20
  líneas hace solo lo que Chrome exige para ofrecer instalar la app, y nada más.
