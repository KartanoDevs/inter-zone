# InterZone — servidor

API REST que guarda y sirve sistemas en PostgreSQL (spec 033), con cuentas, lista blanca y
sesión (spec 035, ADR 0036/0037). **Escribir exige sesión y rol** (crear, editar, clonar,
borrar y validar — specs 037/051, ADR 0038): admin, o entrenador con membresía en el equipo del
sistema. **Leer sigue abierto a cualquiera**: `GET /sistemas` no exige sesión ni filtra por rol
todavía. Vale en local; **no vale en una máquina expuesta a internet** mientras la lectura siga
abierta.
Importa `src/app/domain/` directamente — ver
`docs/decisiones/0025-el-servidor-importa-el-dominio.md`.

## Arranque

Requiere Node 22 o superior y Docker (para Postgres local).

```bash
npm install
cp .env.example .env
npm run db:up              # Postgres en Docker, puerto 5432
npx prisma migrate deploy  # aplica la migración, con sus CHECK a mano
npm run seed                # equipo + jugador + los dos sistemas de ejemplo
npm run dev                  # http://localhost:3000
```

## Tests

Son de integración, contra el Postgres real de `db:up` — no dobles en memoria. Por eso no
entran en el `npm test` de la raíz (ver `vitest.config.ts`: la regla 6 de
`docs/flujo-de-trabajo.md` exige que la suite de `domain/` siga por debajo del segundo, y aquí
cada test habla con una base de datos de verdad).

```bash
npm run db:up
npx prisma migrate deploy
npm test
```

## API

Todas bajo `/api`. El cuerpo de `POST`/`PUT` de `/sistemas` es el `Sistema` de dominio tal cual
lo serializa el cliente — sin traducción de forma en la frontera HTTP.

| Método | Ruta | |
|---|---|---|
| `GET` | `/sistemas?equipoId=masculino\|femenino` | catálogo de ese equipo, sin exigir sesión |
| `POST` | `/sistemas` | exige sesión y rol sobre `equipoId`; crea; `409` si el nombre ya existe en ese equipo y tipo |
| `PUT` | `/sistemas/:id` | exige sesión y rol sobre el equipo dueño; cabecera `If-Match` con `actualizadoEn`; `409` si caducó |
| `PUT` | `/sistemas/:id/estado` | `{ estado: 'validado'\|'borrador' }`; exige sesión y rol (admin, o entrenador del equipo dueño) — `401` sin sesión, `403` sin permiso, `404` si no existe |
| `DELETE` | `/sistemas/:id` | exige sesión y rol sobre el equipo dueño; `404` si no existe |

Las cuatro rutas de escritura de `/sistemas` devuelven `401` sin sesión y `403` si la sesión no
tiene rol sobre ese equipo (spec 037) — el mismo `puedeGestionarEquipo` de `domain/acceso.ts`
en las cuatro.

`GET`/`POST`/`PUT` devuelven el sistema con un campo `actualizadoEn` añadido — metadato de esta
frontera, no del tipo de dominio (ADR 0012): es el testigo que hay que mandar de vuelta en el
próximo `PUT`.

Estas rutas dan cuenta y sesión, y no exigen tenerla ya abierta (salvo las dos últimas, sobre el
propio perfil):

| Método | Ruta | |
|---|---|---|
| `POST` | `/auth/registro` | `{ email, contrasena }`; `403` sin invitación disponible, `409` si el correo ya tiene cuenta, `400` si la contraseña es demasiado corta |
| `POST` | `/auth/entrar` | `{ email, contrasena }`; abre sesión (cookie `iz_sesion`, `HttpOnly`, 30 días); `401` igual para contraseña incorrecta y correo inexistente |
| `POST` | `/auth/salir` | invalida la sesión de la cookie al instante |
| `GET` | `/auth/quien-soy` | `{ usuario: null }` sin sesión o con una caducada, nunca un error; con sesión válida, la renueva y devuelve `{ usuario }` |
| `PUT` | `/auth/perfil` | `{ nombre, posicionFavorita, dorsal }` (los tres, siempre juntos; `null` vacía el campo); exige sesión; `400` si la posición o el dorsal no son válidos |
| `PUT` | `/auth/contrasena` | `{ actual, nueva }`; exige sesión; `401` si `actual` no coincide, `400` si `nueva` es demasiado corta |

Las tres rutas de `/lista-blanca` (spec 054) exigen sesión con rol `admin` — `403` para
cualquier otro rol, `401` sin sesión:

| Método | Ruta | |
|---|---|---|
| `GET` | `/lista-blanca` | lista las invitaciones (pendientes y usadas) con su rol y equipo |
| `POST` | `/lista-blanca` | `{ email, rol, equipoClave? }`; invita, o si el correo ya estaba invitado y sin usar, cambia su rol en la misma fila; `409` si el correo ya tiene cuenta, `400` si el rol o el equipo no son válidos |
| `DELETE` | `/lista-blanca/:email` | retira la invitación; no toca la cuenta si el correo ya se dio de alta desde ella |

## Estructura

```
server/
├── prisma/
│   ├── schema.prisma
│   └── migrations/       # los CHECK y la función celdas_validas() están a mano en el SQL
└── src/
    ├── infraestructura/   # Prisma, los repositorios (sistemas y acceso), la semilla
    ├── http/               # Express: rutas (sistemas, auth, lista-blanca) y la fábrica del servidor
    └── main.ts
```

Diez tablas: las seis de voleibol de `docs/modelo-de-datos.md` (`equipo`, `jugador`, `sistema`,
`sistema_rotacion`, `formacion`, `colocacion`) más las cuatro de acceso que llegaron con la spec
035 (`usuario`, `lista_blanca`, `membresia`, `sesion` — esta última no estaba en el documento
original, que ya avisaba de que si hacía falta pasaría de nueve a diez).
