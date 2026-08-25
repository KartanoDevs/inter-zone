# 035 — Acceso: lista blanca, cuentas y sesión

**Estado:** Completada
**Paso de la hoja de ruta:** 8 (retoma la autenticación que la ADR 0028 había aplazado)

## Problema

Hoy cualquiera que sepa la URL puede leer y escribir cualquier sistema: el servidor no sabe
quién le habla. El entrenador quiere que sus jugadores puedan estudiar los sistemas desde su
casa sin que un desconocido pueda entrar a tocar nada, y quiere decidir él mismo quién entra y
con qué permiso nace cada persona.

## Objetivo

Un correo solo puede tener cuenta si el admin lo invitó de antemano, con contraseña propia, y
la aplicación sabe en todo momento quién ha entrado y qué rol tiene — global (`admin`) o
acotado a uno o los dos equipos (`entrenador`, `usuario`).

## Fuera de alcance

- Cualquier pantalla: esta spec es servidor y reglas, no interfaz. La pizarra pidiendo entrar
  es la spec 050.
- Entrar con Google. Sigue reservado, sin spec asignada.
- Recuperar una contraseña olvidada.
- Que el rol decida qué se puede editar en `/api/sistemas` — esa aplicación del rol es la
  spec 037. Aquí el rol se calcula y se guarda, pero todavía no cierra ninguna puerta.
- Publicar o "validar" un sistema para que se vea en consulta — spec aparte.
- Cambiar el rol de alguien que ya tiene cuenta, o gestionar la lista blanca desde la
  aplicación — eso es la gestión de lista blanca del admin, spec aparte.
- Mover los `Ajustes` de pantalla (validación desactivada, ayuda de posición…) a la cuenta:
  siguen en `localStorage` por dispositivo (ADR 0028).
- Enlazar una cuenta ya creada con contraseña a un login de Google.

## Escenarios

**E1 — Dos formas de escribir el mismo correo cuentan como el mismo correo**
- Dado: la lista blanca tiene invitado `Entrenador@Club.com`
- Cuando: alguien intenta darse de alta con `entrenador@club.com  ` (minúsculas, con espacios)
- Entonces: se reconoce como el mismo correo invitado

**E2 — Un correo que no está en la lista blanca no puede darse de alta**
- Dado: un correo que nadie ha invitado
- Cuando: intenta crear una cuenta con ese correo y una contraseña
- Entonces: se rechaza, sin crear ninguna cuenta

**E3 — Un correo invitado como admin nace admin, sin quedar ligado a ningún equipo**
- Dado: una invitación con rol `admin`
- Cuando: ese correo se da de alta
- Entonces: la cuenta nace con rol de acceso `admin` y no queda ligada a ningún equipo en
  concreto

**E4 — Un correo invitado como entrenador de un equipo nace entrenador solo de ese equipo**
- Dado: una invitación con rol `entrenador` y un equipo concreto
- Cuando: ese correo se da de alta
- Entonces: la cuenta nace con permiso de entrenador en ese equipo, y en ningún otro

**E5 — Un correo invitado sin equipo asignado nace con el rol invitado en los dos equipos**
- Dado: una invitación con rol `entrenador` (o `usuario`) y sin equipo concreto
- Cuando: ese correo se da de alta
- Entonces: la cuenta nace con ese mismo permiso en los dos equipos existentes

**E6 — La invitación se sella al usarse y no sirve una segunda vez**
- Dado: una invitación ya usada para crear una cuenta
- Cuando: alguien intenta darse de alta otra vez con ese mismo correo
- Entonces: se rechaza, aunque el correo siga técnicamente en la lista blanca

**E7 — Darse de alta dos veces con el mismo correo se rechaza**
- Dado: un correo que ya tiene cuenta
- Cuando: se intenta crear otra cuenta con ese correo
- Entonces: se rechaza y no se crea una segunda cuenta

**E8 — La contraseña nunca se guarda en claro**
- Dado: alguien se da de alta con una contraseña
- Cuando: se inspecciona lo que queda guardado
- Entonces: no aparece la contraseña tal cual en ningún sitio, solo su forma derivada con
  factor de coste

**E9 — Una contraseña más corta que el mínimo se rechaza al darse de alta**
- Dado: un correo invitado
- Cuando: intenta darse de alta con una contraseña por debajo del mínimo exigido
- Entonces: se rechaza y no se crea la cuenta

**E10 — Entrar con la contraseña correcta abre una sesión con caducidad**
- Dado: una cuenta ya creada
- Cuando: entra con su correo y su contraseña correcta
- Entonces: se abre una sesión que caduca pasado un tiempo fijo

**E11 — Entrar con la contraseña equivocada, y entrar con un correo inexistente, responden igual**
- Dado: (a) una cuenta existente y una contraseña incorrecta, o (b) un correo sin cuenta
- Cuando: se intenta entrar en cualquiera de los dos casos
- Entonces: la respuesta es indistinguible entre ambos — nunca se revela si el correo existe

**E12 — Usar la sesión la renueva**
- Dado: una sesión abierta, todavía dentro de su plazo
- Cuando: se usa para pedir algo al servidor
- Entonces: su caducidad se aleja otro plazo completo desde ese instante

**E13 — Una sesión caducada deja de identificar a nadie**
- Dado: una sesión cuyo plazo ya pasó
- Cuando: se intenta usar para pedir algo al servidor
- Entonces: se trata igual que si no hubiera sesión ninguna

**E14 — Salir invalida la sesión al instante**
- Dado: una sesión abierta y vigente
- Cuando: esa cuenta pide salir
- Entonces: la misma sesión deja de servir inmediatamente, sin esperar a que caduque sola

**E15 — Preguntar quién ha entrado sin tener sesión responde que nadie, no un error**
- Dado: ninguna sesión activa (nunca entró, o ya salió, o caducó)
- Cuando: se pregunta quién ha entrado
- Entonces: la respuesta es "nadie", no un fallo del servidor

**E16 — El testigo de sesión no se guarda tal cual, solo su huella**
- Dado: una sesión recién abierta
- Cuando: se inspecciona lo que queda guardado sobre ella
- Entonces: el valor que identifica la sesión en el navegador no aparece guardado tal cual,
  solo una huella derivada de él

**E17 — El primer admin nace de una invitación sembrada al arrancar el servidor**
- Dado: un servidor que arranca por primera vez, sin ninguna cuenta todavía, con un correo de
  administrador fijado de antemano
- Cuando: arranca
- Entonces: ese correo queda invitado con rol `admin`, listo para que esa persona complete su
  alta por el camino normal — sin que su contraseña haya pasado nunca por ningún fichero

## Preguntas abiertas

Ninguna.

## Al cerrar

Los 17 escenarios están en verde: E1, E3, E4 y E5 como dominio puro
(`src/app/domain/acceso.ts`, `acceso.spec.ts`); E2, E6-E17 como tests de integración contra
Postgres real (`server/src/http/auth.rutas.spec.ts`), en el mismo patrón que
`sistemas.rutas.spec.ts`. Suite de dominio: 358/358. Suite de servidor: 29/29. `npm run
typecheck` limpio en raíz y en `server/`. No existe script `test:coverage`; no se ha inventado
uno.

**Desviación no prevista, encontrada al generar la migración:** `prisma migrate dev
--create-only` propuso, además de las tablas nuevas, borrar dos índices (`jugador_orden_saque_key`,
`jugador_rol_indice_key`) escritos a mano en la migración inicial —invariantes de las specs
017/018, con `NULLS NOT DISTINCT`, que Prisma no ve en su propio esquema— y crear de nuevo un
enum `via_ataque` que la spec 038 ya había borrado de la base real pero que `schema.prisma`
seguía declarando sin usar. Las tres líneas se quitaron a mano de la migración generada antes de
aplicarla; se aprovechó para borrar también la declaración muerta de `schema.prisma`. Ninguna de
las dos cosas tiene que ver con acceso: es la advertencia de `docs/modelo-de-datos.md` §6 sobre
revisar toda migración generada, confirmada en la práctica.

**Desviación de diseño, corregida sobre la marcha:** el primer intento de `sesion` llevaba un
`CHECK (expira_en > creada_en)`. Falló en el primer test que simulaba una sesión caducada,
porque el `CHECK` se reevalúa en cada `UPDATE`, no solo al crear la fila — y la renovación (E12)
cambia `expira_en` sin tocar `creada_en`, así que el simple paso del tiempo lo rompía. Se quitó:
la garantía de que una sesión nunca nace ya caducada la da `abrirSesion` en infraestructura, no
un `CHECK`. Documentado en el propio esquema y en `docs/modelo-de-datos.md`.

**Ninguna otra sorpresa.** El resto salió tal como se planificó: `resolverAltaDesdeInvitacion`
en dominio y su composición con Prisma en `acceso.repositorio.ts` no necesitaron ningún ajuste
tras el primer borrador.

**Escenarios que comparten camino de código, a propósito:** E6 («invitación ya usada») y E7
(«correo ya registrado») verifican el mismo rechazo (`InvitacionNoDisponible`) porque, con el
flujo actual, sellar la invitación y crear la cuenta ocurren en la misma transacción — no existe
hoy un estado donde el correo tenga cuenta pero la invitación siga sin sellar. Los dos
escenarios se conservan porque los dos son afirmaciones de producto válidas y ya estaban en la
spec congelada, aunque hoy los pruebe el mismo camino.
