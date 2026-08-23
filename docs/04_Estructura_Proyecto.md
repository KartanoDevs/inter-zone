# 04 — Estructura del proyecto y flujo de datos

> Documento de lectura. La versión normativa está en `docs/arquitectura.md` §«Estructura de
> carpetas»; el arranque del backend, en `server/README.md`.

---

## 1. Árbol de directorios

```
inter-zone/
│
├── src/                              ── FRONTEND (Angular 22)
│   ├── main.ts                        bootstrapApplication(App, appConfig)
│   ├── index.html
│   ├── styles.css
│   └── app/
│       ├── app.ts                     shell mínimo: <app-tablero>
│       ├── app.html
│       ├── app.config.ts              cableado del store + provideAppInitializer
│       │
│       ├── domain/                   ── EL VOLEIBOL. No importa nada externo.
│       │   ├── modelos.ts             Punto, Jugador, RolId, Sistema, Formacion, Colocacion,
│       │   │                          Celda, ViaAtaque, EquipoId, ResultadoValidacion…
│       │   ├── roles.ts               configuración de roles + etiquetaDe()
│       │   ├── equipos.ts             los dos equipos fijos (spec 032)
│       │   ├── rotacion.ts            rotar, formacionEnRotacion, rotacionDe,
│       │   │                          jugadoresEnPista, zaguerosEnRotacion
│       │   ├── validacion.ts          validarFormacion → infracciones + avisos
│       │   ├── plantilla.ts           validarPlantilla (composición de los seis)
│       │   ├── plantillas-equipo.ts   crear/borrar plantillas
│       │   ├── plantilla-global.ts    la única plantilla real: 6 titulares + líbero
│       │   ├── defensa.ts             viaDeAtaque(punto) → z4|z3|z2|pipe
│       │   ├── rejilla.ts             TAMANO_CELDA, celdaDe, centroDe, bloquePorDefecto,
│       │   │                          trazoCerrado, rellenarContorno, celdasDeTrazo
│       │   ├── catalogo-sistemas.ts   crear/renombrar/borrar/clonar/ordenar/describir
│       │   ├── sistema-recepcion.ts   guardarFormacion, sistemaCompleto, explicar*
│       │   ├── sistema-defensa.ts     guardarFormacionDefensa (sin validación)
│       │   ├── sistema-por-defecto.ts        la recepción a 3 en 5-1, sembrada
│       │   ├── sistema-defensa-por-defecto.ts el 2-1-3, sembrado
│       │   ├── puertos.ts             SistemaRepository, AjustesRepository, los 3 errores
│       │   └── *.spec.ts              156 tests, junto al fichero que prueban
│       │
│       ├── application/              ── ORQUESTACIÓN (signals)
│       │   ├── sistema.store.ts       SistemaStore: el único estado de la app (575 líneas)
│       │   └── sistema.store.spec.ts  81 tests, sin TestBed
│       │
│       ├── infrastructure/           ── ADAPTADORES
│       │   ├── http-sistema.repository.ts          ◀ EN USO (spec 034)
│       │   ├── local-storage-sistema.repository.ts   legado v1, ya no cableado
│       │   ├── local-storage-ajustes.repository.ts ◀ EN USO (excepción deliberada)
│       │   └── *.spec.ts              40 tests
│       │
│       ├── ui/                       ── COMPONENTES (standalone, OnPush, zoneless)
│       │   ├── tablero/               Tablero — el shell (689 líneas): consume el store,
│       │   │                          gestiona arrastre y pintado por PointerEvent
│       │   ├── pista/                 Pista (SVG, viewBox en metros) + FichaJugador
│       │   ├── rotaciones/            SelectorRotacion (R1–R6) + SelectorVia (defensa)
│       │   ├── panel/                 PaletaJugadores, PanelValidacion, PanelEnsenanza
│       │   ├── sistemas/              BarraSistemas, DialogoSistema, SelectorEquipo
│       │   ├── ajustes/               DialogoAjustes (las cuatro banderas)
│       │   └── comun/                 Modal, DialogoConfirmacion, orden-roles
│       │
│       └── maqueta/                  ── BOCETO CONGELADO. No se renderiza ni se borra.
│
├── server/                           ── BACKEND (Node + Express 5 + Prisma)
│   ├── package.json                   proyecto aparte, con su propio node_modules
│   ├── docker-compose.yml             PostgreSQL local
│   ├── .env.example                   DATABASE_URL, ORIGEN_PERMITIDO
│   ├── prisma/
│   │   ├── schema.prisma              las 6 tablas construidas
│   │   └── migrations/                ⚠ los CHECK y celdas_validas() van A MANO en el SQL
│   ├── generated/prisma/              cliente generado (no se edita)
│   └── src/
│       ├── main.ts                    escucha el puerto
│       ├── http/
│       │   ├── servidor.ts            crearServidor(): Express + CORS a mano
│       │   ├── sistemas.rutas.ts      GET/POST/PUT/DELETE /api/sistemas
│       │   └── sistemas.rutas.spec.ts 12 tests de integración contra Postgres real
│       └── infraestructura/
│           ├── prisma.ts              el cliente
│           ├── sistema.repositorio.ts traduce filas ⇄ Sistema de dominio
│           └── semilla.ts             npm run seed
│
├── docs/                             ── DOCUMENTACIÓN
│   ├── dominio.md                     ★ las reglas del voleibol. Fuente de verdad.
│   ├── arquitectura.md                ★ capas y dependencias permitidas
│   ├── modelo-de-datos.md             ★ el esquema completo, razonado
│   ├── flujo-de-trabajo.md            SDD + TDD
│   ├── decisiones/                    28 ADRs, append-only
│   ├── especificaciones/              una spec por porción de trabajo
│   └── voley/                         material de referencia: guías, PDFs, maquetas
│
├── CLAUDE.md                          contexto e invariantes para asistentes de IA
├── README.md                          punto de entrada + hoja de ruta
├── angular.json · vitest.config.ts · tsconfig*.json
└── package.json
```

---

## 2. Glosario de carpetas

### `src/app/domain/` — el voleibol

**Qué va aquí:** modelos, tipos y reglas del juego. Funciones puras. Las interfaces de los
puertos, sin implementación.

**Qué NO va aquí:** cualquier `import` que no apunte a otro fichero de `domain/`. Ni Angular, ni
RxJS, ni el DOM, ni utilidades de terceros. Tampoco fechas ni aleatoriedad: `creadoEn` /
`actualizadoEn` viven en el repositorio (ADR 0012).

**Cómo saber si algo pertenece aquí:** ¿se lo explicarías a un entrenador sin mencionar
software? Entonces va aquí. **La configuración de roles vive aquí**, no en la UI ni en un
fichero de entorno: cambiar «Receptor» por «Punta» es cambiar el vocabulario del dominio.

*Excepción única y deliberada:* las tres clases de error de `puertos.ts` heredan de `Error` sin
añadir estado. La regla de fondo es «sin estado propio, sin fecha, sin aleatoriedad», no «cero
clases».

### `src/app/application/` — la orquestación

**Qué va aquí:** `SistemaStore`, y solo eso. Signals escribibles (estado crudo), `computed`
(todo lo derivado) y acciones (las que persisten, `async`).

**Qué NO va aquí:** lógica de voleibol. **Si aparece un `if` sobre posiciones, pertenece a
`domain/`.**

**Detalle de diseño:** el store no lleva decorador de Angular. Se instancia con `new` y se
cablea con `useFactory` en `app.config.ts`, lo que permite testearlo sin `TestBed`.

### `src/app/infrastructure/` — los adaptadores

**Qué va aquí:** implementaciones de los puertos declarados en `domain/`. Todo lo que habla con
el mundo exterior: red, `localStorage`.

**Patrón común:** cada adaptador recibe su dependencia externa por constructor —
`AlmacenClaveValor` para `localStorage`, `fetchFn` para HTTP — para poder testearlo sin DOM y
sin `TestBed`.

**Detalle:** se usa `fetch` nativo, **no el `HttpClient` de Angular**, por ese mismo motivo.

### `src/app/ui/` — los componentes

**Qué va aquí:** componentes standalone con prefijo `app-`, `ChangeDetectionStrategy.OnPush`,
un `.ts` + `.html` + `.css` por componente.

**Qué NO va aquí:** cálculos del dominio. Ni siquiera la etiqueta de una ficha — llega ya
derivada. Los componentes **leen signals y emiten intenciones**.

*Dos excepciones deliberadas, ambas en `Tablero`:* distinguir un toque de un arrastre por la
distancia en píxeles de pantalla, y decidir si un trazo de pintado pinta o borra. Son
distinciones de **interacción**, no de voleibol.

### `src/app/maqueta/` — el boceto congelado

Referencia visual de la spec 009. **No se renderiza** (`app.html` ya no la monta) y **no se
borra**. No se toca.

### `server/src/http/` — la frontera

Rutas de Express y la fábrica del servidor. `crearServidor()` no escucha puerto: eso lo hace
`main.ts`, y los tests levantan su propia instancia efímera.

**Las rutas reciben y devuelven el `Sistema` de dominio tal cual lo serializa el cliente**, sin
traducción de forma en la frontera HTTP.

### `server/src/infraestructura/` — Prisma

El cliente, el repositorio que traduce entre filas de PostgreSQL y el `Sistema` de dominio, y la
semilla. **Es el único sitio donde se sabe que existe SQL.**

### `docs/decisiones/` — las ADRs

Append-only. Una decisión existente **no se edita**: si cambia, se añade una nueva que la
sustituye y se marca la anterior como *Sustituida por NNNN*. Formato corto: contexto, decisión,
consecuencias. Lo importante es el **porqué**, que es lo único que no se puede deducir leyendo
el código dentro de seis meses.

### `docs/especificaciones/` — las specs

Una por porción de trabajo entregable, no por fichero ni por clase. Debe caber en una pantalla.
Estados: `Borrador` → `Congelada` → `Completada`. **Una spec congelada no se edita durante la
implementación.**

---

## 3. Flujo de datos

### 3.1 Arranque — de PostgreSQL a la pizarra

```
main.ts
  └─ bootstrapApplication(App, appConfig)
       │
       ├─ useFactory: new SistemaStore(
       │      new HttpSistemaRepository('http://localhost:3000/api'),
       │      new LocalStorageAjustesRepository(localStorage))
       │
       └─ provideAppInitializer(() => store.cargar())     ◀ Angular ESPERA aquí
            │
            ├─ repositorio.listar()
            │    ├─ GET /api/sistemas?equipoId=masculino   ┐ las dos en Promise.all
            │    └─ GET /api/sistemas?equipoId=femenino    ┘
            │         │
            │         └─ Express → sistemas.rutas.ts → sistema.repositorio.ts
            │              ├─ prisma.sistema.findMany({ include: rotaciones/formaciones })
            │              ├─ $queryRaw para `celdas` (Prisma no maneja int[] opcional)
            │              └─ ensamblarSistema(): filas ──▶ Sistema de dominio
            │                   · reconstruye la plantilla desde el catálogo `jugador`
            │                   · indiceACelda(): índice lineal ──▶ { columna, fila }
            │
            │    ◀── el adaptador guarda `actualizadoEn` de cada sistema en un Map por id
            │        (testigo de concurrencia) y lo quita del objeto de dominio
            │
            ├─ sistemas.set(ordenarCatalogo(...))
            ├─ sistemaActivoId.set(catalogo()[0]?.id ?? null)
            ├─ ajustesRepositorio.leer()  ← localStorage
            └─ cambiarContexto(): borrador ← formacionGuardadaActiva
                 │
                 └─ App monta <app-tablero>, ya con el catálogo poblado
```

**Por qué `provideAppInitializer`:** así ningún consumidor ve nunca el estado a medio poblar. Es
la misma garantía que antes daba un constructor síncrono, ahora que la carga es asíncrona.

**Consecuencia práctica:** sin el backend levantado no se ve más que una pantalla vacía. No
basta con `npm install && npm start` en la raíz.

### 3.2 Editar — el bucle que no toca la red

Arrastrar una ficha **no persiste nada**. Todo ocurre en memoria hasta que se pulsa Guardar:

```
  usuario arrastra una ficha sobre el <svg>
       │
       ▼
  Pista emite el PointerEvent  ──▶  Tablero lo captura (sobre el <svg>, nunca sobre la ficha)
       │                                   │
       │                                   └─ ¿distancia > umbral? arrastre : toque
       ▼
  store.colocarOMover(jugadorId, punto)          ← punto ya convertido a METROS
       │
       └─ borrador.update(...)                    ← signal escribible. Conserva `celdas`
            │                                       y `explicacion` de la colocación previa
            ▼
       computed en cascada, sin que nadie los llame:
            ├─ posicionesActivas    ─▶ jugadoresEnPista(plantilla, rotacion)     [domain]
            ├─ resultadoValidacion  ─▶ validarFormacion(borrador, posiciones)    [domain]
            ├─ hayCambiosSinGuardar ─▶ compara borrador vs formacionGuardadaActiva
            └─ puedeGuardar         ─▶ ¿los seis colocados y sin infracciones?
            │
            ▼
       Angular repinta (OnPush + zoneless): PanelValidacion, FichaJugador, botón Guardar
```

**Las dos formaciones a la vez** —`borrador` y `formacionGuardadaActiva`— son el mecanismo que
permite avisar de cambios sin guardar, y que un guardado fallido no destruya el trabajo.

*Variante de pintado (solo en defensa):* con un jugador seleccionado, arrastrar sobre el **fondo**
de la pista dispara `pintarCelda`/`borrarCelda` en vez de mover fichas. El primer punto tocado
decide si el trazo entero pinta o borra. Al soltar, si el trazo se cerró, `celdasDeTrazo` rellena
el interior.

### 3.3 Guardar — de la pizarra a PostgreSQL

```
  usuario pulsa Guardar
       │
       ▼
  store.guardar()
       │
       ├─ recepción: guardarFormacion(sistema, rotacion, borrador, validar)     [domain]
       │  defensa:   guardarFormacionDefensa(sistema, rotacion, via, borrador)  [domain]
       │       └─ devuelve un Sistema NUEVO, o null si la formación es ilegal
       │
       ▼
  ejecutarEscritura(accion, reintentar)              ◀ ADR 0026: red primero, signals después
       │
       ├─ await repositorio.actualizar(sistemaNuevo)
       │    │
       │    ├─ PUT /api/sistemas/:id
       │    │     headers: content-type + If-Match: <testigo del Map>
       │    │     body:    el Sistema de dominio serializado, sin traducir
       │    │
       │    ▼
       │  sistemas.rutas.ts
       │    ├─ sin If-Match ──────────────────────▶ 400
       │    └─ sistema.repositorio.actualizar(sistema, testigo)
       │         │
       │         └─ prisma.$transaction:
       │              ├─ comprobarRoster(): ¿son los seis que tocan en esa rotación?
       │              ├─ UPDATE sistema … WHERE id = $1 AND actualizado_en = $2
       │              │     └─ 0 filas ──▶ ConflictoDeConcurrencia ──▶ 409
       │              ├─ borra y reescribe formaciones + colocaciones de ese sistema
       │              │     └─ `celdas` con $executeRaw (celdaAIndice: {col,fila} ─▶ int)
       │              └─ devuelve el nuevo `actualizado_en`
       │
       ├─ ✅  el adaptador refresca el testigo en su Map
       │      └─ sistemas.update(): sustituye SOLO ese sistema en el catálogo local
       │      └─ borrador.set(formacionGuardadaActiva())
       │      └─ errorGuardado.set(null)
       │
       └─ ❌  NINGÚN signal de estado se toca. El borrador sigue intacto.
              errorGuardado.set({ mensaje, reintentar })
                   │
                   └─ Tablero muestra el aviso con «Reintentar» y «Cerrar»
```

**Los tres motivos de fallo**, traducidos por `HttpSistemaRepository` y declarados por el puerto:

| Excepción | Cuándo | Qué invita a hacer |
|---|---|---|
| `ErrorDeRed` | la petición no llegó | comprobar la conexión y reintentar |
| `ErrorDelServidor` | respondió con error | trae su propio motivo del cuerpo JSON |
| `ConflictoDeEdicion` | `409` | **alguien más guardó ese sistema**; reintentar sin más volvería a pisarlo |

**`reintentar` significa siempre «vuelve a intentar esta misma operación desde el principio»**,
nunca «reanuda a medias». Y cerrar el aviso no descarta el trabajo sin guardar: solo dice
«cerrado».

### 3.4 Las cuatro operaciones del catálogo

Cada acción del store llama **al método del puerto que corresponde a lo que tocó**, nunca a uno
que reescriba el catálogo entero (ADR 0024):

| Acción | Puerto | HTTP | Nota |
|---|---|---|---|
| `crear(nombre, tipo, equipoId)` | `crear` | `POST /sistemas` | `409` si el nombre ya existe en ese equipo y tipo |
| `clonar(nombre)` | `crear` | `POST /sistemas` | mismo equipo que el original, sin parámetro propio |
| `guardar`, `renombrarActivo`, `guardarExplicacion`, `guardarDescripcion`, `cambiarSustitutoLibero` | `actualizar` | `PUT /sistemas/:id` | exige `If-Match` |
| `borrar(id)` | `borrar` | `DELETE /sistemas/:id` | `404` si no existe |

Los **ajustes de pantalla** van por otro camino: `AjustesRepository` → `localStorage`. Nunca
tocan la red.

---

## 4. Cómo levantarlo

Requiere **Node ≥ 22** y **Docker** (para el Postgres local).

```bash
# Terminal 1 — backend
cd server
npm install
cp .env.example .env
npm run db:up               # PostgreSQL en Docker
npx prisma migrate deploy
npm run seed                # equipo + jugador + los dos sistemas de ejemplo
npm run dev                 # http://localhost:3000

# Terminal 2 — pizarra
npm install
npm start                   # http://localhost:4200
```

### Tests

```bash
npm test          # raíz: domain/ + application/ + infrastructure/ — sin DOM, en milisegundos
cd server && npm test   # integración contra el Postgres real; requiere db:up + migrate
```

Las dos suites están separadas a propósito: **la regla dura es que la de `domain/` siga por
debajo del segundo**, y los tests del servidor hablan con una base de datos de verdad.

```bash
npm run typecheck   # tsc --noEmit sobre app y specs
```

---

## 5. Dónde mirar según lo que vayas a tocar

| Si vas a… | Lee antes |
|---|---|
| Cambiar una regla del juego | `docs/dominio.md` — y **comprueba la fuente FIVB** |
| Crear ficheros o mover código | `docs/arquitectura.md` |
| Escribir código | `docs/flujo-de-trabajo.md` (SDD + TDD) |
| Tocar la base de datos | `docs/modelo-de-datos.md` §6 «Lo que NO va en la base de datos» |
| Entender por qué algo es así | `docs/decisiones/` |
| Implementar una spec | `CLAUDE.md` §«Protocolo de arranque» |
