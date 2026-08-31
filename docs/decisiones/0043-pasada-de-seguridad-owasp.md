# 0043 — Pasada de seguridad OWASP: limitador propio, hash versionado y confianza en el proxy

**Estado:** Aceptada

## Contexto

InterZone tiene backend, base de datos y cuentas reales desde la v2, pero hasta ahora no se
había hecho una revisión de seguridad de la aplicación entera —solo las piezas que cada spec
tocaba de pasada—. Esta ADR recoge lo que decidió esa revisión, hecha sobre la rama
`seguridad/auditoria-general` con la guía del OWASP Top 10. La auditoría encontró siete huecos;
la mayoría se cerraron con cambios mecánicos que no necesitan una decisión (una comprobación de
sesión que faltaba, cabeceras HTTP, un `overrides` de `npm audit`). Los tres que sí fijan un
criterio para el futuro son los de abajo.

Lo que se dejó **fuera a propósito**, y sigue pendiente: no hay registro de auditoría de
eventos de seguridad (A09), y cambiar la contraseña no revoca las demás sesiones de la cuenta.
Mientras eso siga así, la API no debe exponerse a una red que no sea de confianza.

## Decisión

**1. El límite de intentos de credenciales es un limitador propio en memoria, no una
dependencia.** `/api/auth/entrar`, `/registro` y `/contrasena` pasan por un middleware que
cuenta los intentos fallidos por IP en una ventana fija y responde `429` al superarla; los
intentos que aciertan no cuentan. Vive en `server/src/http/limitador.ts`, sin paquetes nuevos,
igual que el CORS y el lector de cookies ya escritos a mano. El estado se pierde al reiniciar el
proceso, lo que aquí es aceptable. Se descartó `express-rate-limit` por la misma razón que el
proyecto hace la autenticación con `node:crypto`: una dependencia de producción que no hace
falta. El limitador se instancia dentro de `crearServidor()` (se puede inyectar para que un
test reinicie su contador sin recrear el servidor).

**2. El hash de contraseña lleva sus parámetros dentro y se regenera al entrar.** Formato
`scrypt$N$r$p$sal$derivada`. Se sube el coste sobre los valores por defecto de Node subiendo
`p` (a 5), no `N`: `p` multiplica la CPU sin multiplicar la memoria (~16 MB por hash), lo que en
el VPS pequeño del despliegue es la diferencia entre endurecer y quedarse sin RAM. Los hashes
del formato viejo (`sal:derivada`, sin parámetros, `p=1`) se siguen verificando con los
parámetros de entonces y se **rehashean al vuelo** la próxima vez que la cuenta entra con la
contraseña correcta. Así no hace falta ni migración ni reseteo de contraseñas. Esto precisa —no
revierte— la ADR 0037, que ya había elegido `scrypt`. De paso, `scrypt` pasa a asíncrono: la
versión síncrona bloqueaba el bucle de eventos y unas pocas peticiones concurrentes bastaban
para tumbar la API.

**3. La IP real se deduce contando saltos de proxy, no confiando en `X-Forwarded-For`.**
`app.set('trust proxy', SALTOS_PROXY)`, con `SALTOS_PROXY=2` en el despliegue estándar (el
nginx de `web` y Nginx Proxy Manager en el host) y `0` por defecto —usar la IP del socket—.
Contar saltos desde la derecha de la cabecera es lo que impide que un cliente se invente su
`X-Forwarded-For` para esquivar el limitador; `trust proxy: true` sí sería falsificable.

## Consecuencias

- `authRutas` deja de ser un `Router` de módulo y pasa a ser la factoría
  `crearAuthRutas(limitador)`. `crearServidor()` acepta un limitador opcional.
- `hashContrasena`/`verificarContrasena` son asíncronas; `registrar`, `entrar` y
  `cambiarContrasena` de `acceso.repositorio.ts` hacen `await`. La suite de integración del
  servidor tarda ~30 s (antes ~10): cada alta y cada login derivan con `p=5`. Sigue fuera del
  `npm test` de la raíz, así que la regla del segundo de `docs/flujo-de-trabajo.md` no se toca.
- El primer login de cada cuenta existente tras desplegar esto hace un `UPDATE` extra (el
  rehash). Una sola vez por cuenta.
- `docker-compose.prod.yml` y `.env.produccion.example` ganan `SALTOS_PROXY`. El `nginx.conf`
  del frontend repite en la `location /api/` las cabeceras de seguridad que solo tenía en
  `location /` (nginx las reemplaza por bloque, no las hereda).
- El registro ya no distingue "no invitado" de "ya registrado" ni deja que un `400` por
  contraseña corta revele si un correo está en la lista blanca (A07). No cambia ningún escenario
  de la spec 035: E2, E6 y E7 solo dicen "se rechaza".

## Alternativas descartadas

- **`express-rate-limit`**: ver decisión 1.
- **Subir `N` a 2^17 en vez de `p` a 5**: trabajo equivalente para el atacante, pero ~130 MB
  por hash concurrente. En un host que comparte varias apps, invita al OOM killer.
- **JWT en vez de sesión opaca**: ya se descartó en la ADR 0037 y nada aquí lo reabre.
- **`npm audit fix --force`** para el aviso de `deepmerge-ts`: proponía bajar `prisma` de
  `6.19.3` a `6.12.0`. Un downgrade no es un arreglo; se usó un `overrides` puntual.
