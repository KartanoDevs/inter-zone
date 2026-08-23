# InterZone — servidor

API REST que guarda y sirve sistemas en PostgreSQL (spec 033). **Sin autenticación, y aplazada**
(ADR 0028): las specs 035-037 salieron del camino corto, así que la API acepta cualquier petición
del origen permitido. Vale en local; **no vale en una máquina expuesta a internet**.
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

Todas bajo `/api`. El cuerpo de `POST`/`PUT` es el `Sistema` de dominio tal cual lo serializa
el cliente — sin traducción de forma en la frontera HTTP.

| Método | Ruta | |
|---|---|---|
| `GET` | `/sistemas?equipoId=masculino\|femenino` | catálogo de ese equipo |
| `POST` | `/sistemas` | crea; `409` si el nombre ya existe en ese equipo y tipo |
| `PUT` | `/sistemas/:id` | requiere cabecera `If-Match` con `actualizadoEn`; `409` si caducó |
| `DELETE` | `/sistemas/:id` | `404` si no existe |

`GET`/`POST`/`PUT` devuelven el sistema con un campo `actualizadoEn` añadido — metadato de esta
frontera, no del tipo de dominio (ADR 0012): es el testigo que hay que mandar de vuelta en el
próximo `PUT`.

## Estructura

```
server/
├── prisma/
│   ├── schema.prisma
│   └── migrations/       # los CHECK y la función celdas_validas() están a mano en el SQL
└── src/
    ├── infraestructura/   # Prisma, el repositorio de sistemas, la semilla
    ├── http/               # Express: rutas y la fábrica del servidor
    └── main.ts
```

Seis tablas de las nueve de `docs/modelo-de-datos.md` (`equipo`, `jugador`, `sistema`,
`sistema_rotacion`, `formacion`, `colocacion`). Las tres de acceso (`usuario`, `lista_blanca`,
`membresia`) quedan **aplazadas** (ADR 0028): su diseño sigue intacto y, cuando se retomen,
entrarán en una migración nueva que no toca esta.
