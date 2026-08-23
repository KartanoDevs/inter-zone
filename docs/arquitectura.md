# Arquitectura

## La regla que sostiene todo lo demás

**`domain/` no importa nada. Ni Angular, ni el navegador, ni librerías.**

Solo TypeScript. Si un fichero de `domain/` tiene un `import` que no apunta a otro fichero
de `domain/`, está mal. Esto no es purismo: es lo que permite testear todas las reglas del
voleibol en milisegundos, sin `TestBed`, sin DOM y sin arrancar nada.

## Dirección de las dependencias

```
    ui/  ──────────►  application/  ──────────►  domain/
                            │                        ▲
                            ▼                        │
                    infrastructure/  ────────────────┘

    server/  ──────────────────────────────────────►  domain/
```

Las flechas apuntan solo hacia dentro. `domain/` no conoce a nadie. `infrastructure/`
implementa puertos que se **declaran** en `domain/`.

`server/` (spec 033) es un segundo consumidor de `domain/`, con sus propias reglas: importa
`src/app/domain/` con rutas relativas y nunca al revés, y nunca importa de `application/`,
`infrastructure/` ni `ui/` — el dominio no sabe que existe un servidor (ADR 0025, invariante 8
de `CLAUDE.md`). Es exactamente lo que el invariante 2 (`domain/` no importa nada externo) hace
posible: el mismo código de reglas de voleibol corre en el navegador y en Node sin adaptador
intermedio.

## Capas

### `domain/`

Modelos y reglas. Aquí vive el voleibol.

- `modelos.ts` — `Punto`, `Jugador`, `RolId`, `DefinicionRol`, `OrdenSaque`, `PlantillaEquipo`,
  `TipoSistema`, `ViaAtaque`, `Celda`, `Sistema` (con `formaciones` para recepción y `defensas`
  —por rotación y por vía, spec 021— para defensa, y `descripcion?` — descripción general
  independiente de la rotación, spec 025), `Colocacion` (con `celdas?`, la rejilla de
  responsabilidad de ese jugador en esa formación, solo en defensa desde la spec 024),
  `Formacion`, `Infraccion`, `Aviso`, `ResultadoValidacion`. Desde la spec 024, `celdas`
  distingue dos estados que antes eran indistinguibles: `undefined` es "nunca tocada" (se
  muestra el bloque por defecto derivado del punto) y `[]` es "vaciada a propósito" (cero
  celdas, sin defecto). Solo se llega a `[]` borrando la última celda pintada.
- `roles.ts` — configuración de roles por defecto y `etiquetaDe()`.
- `equipos.ts` — los dos equipos fijos (spec 032, `EQUIPOS`, `NOMBRE_EQUIPO`), mismo patrón que
  `roles.ts`: el identificador es estable, el nombre visible es lo único configurable.
- `rotacion.ts` — `rotar`, `formacionEnRotacion`, `rotacionDe`: deriva las posiciones
  rotacionales ancladas al colocador (ADR 0010). `jugadoresEnPista(plantilla, rotacion)`
  deriva quién juega de verdad — el líbero en vez del titular si le toca zaga (ADR 0014).
  `zaguerosEnRotacion(orden, rotacion)` deriva quiénes ocupan P1/P5/P6 en una rotación; la usan
  tanto `sustitutosLiberoPorDefecto` como la UI para filtrar el selector del líbero.
- `defensa.ts` — `viaDeAtaque(punto): ViaAtaque`: deriva la vía de ataque (zona 4/3/2/pipe) de
  un punto del campo rival, con el espejo de zonas ya resuelto (spec 021, ver `docs/dominio.md`
  §3). Función pura, sin estado.
- `rejilla.ts` — `TAMANO_CELDA` (0,5 m, ADR 0004), `celdaDe(punto): Celda | null` (`null` fuera
  de las líneas del campo propio) y `centroDe(celda): Punto` (spec 022). `bloquePorDefecto(punto):
  Celda[]` (spec 024): el bloque de hasta 2×2 celdas más cercano a un punto — cerca de una línea
  del campo se recorta a 2×1 o 1×1 en vez de desplazarse entero hacia dentro. `trazoCerrado(trazo):
  boolean`, `rellenarContorno(contorno): Celda[]` (flood fill puro desde fuera de la rejilla) y
  `celdasDeTrazo(trazo): Celda[]` (combina las dos: si el trazo se cierra, rellena; si no, lo
  devuelve tal cual) — pintado por contorno, spec 024. `cobertura.ts` (huecos y conflictos) sigue
  sin existir: llega con las specs 014–015 de la hoja de ruta.
- `sistema-defensa.ts` — `guardarFormacionDefensa(sistema, rotacion, via, formacion)`: análogo a
  `guardarFormacion` pero keyed por rotación y vía, y **nunca** valida posición (spec 021, en
  defensa la validación no existe). Reutiliza `jugadoresEnPista` para el roster, igual que
  recepción.
- `plantilla.ts` — `validarPlantilla`: composición y coherencia de índices de los seis
  titulares. El índice de cada jugador se declara en la plantilla, no se deriva (ADR 0017); no
  hay ninguna función que lo calcule. El líbero nunca es uno de los seis (ADR 0014); si aparece
  dentro del orden de saque, la composición se rechaza.
- `plantillas-equipo.ts` — `puedeCrearPlantillaEquipo` (con líbero opcional: a quién sustituye
  debe ser uno de los seis titulares), `puedeBorrarPlantillaEquipo`.
- `plantilla-global.ts` — la única plantilla real de la v1: seis titulares con índice declarado
  a mano y un líbero que sustituye, en cada rotación, al central que caiga en zaga en ella (ADR
  0015). Configuración por defecto, igual que `roles.ts`.
- `validacion.ts` — `validarFormacion(formacion, posiciones): ResultadoValidacion`. No deriva
  las posiciones ella misma: las recibe ya resueltas de quien la llama, con
  `formacionEnRotacion` (sin líbero) o `jugadoresEnPista` (con él) — así no necesita saber
  nada de líberos (ADR 0014).
- `catalogo-sistemas.ts` — `crearSistema`, `renombrarSistema`, `borrarSistema`,
  `ordenarCatalogo`, `cambiarSustitutoLibero` (a quién sustituye el líbero, purgando cada
  formación con el roster que le toca en su propia rotación — ADR 0014), `describirSistema`
  (descripción general del sistema, spec 025; texto en blanco la borra, igual que
  `explicarRotacion`), `clonarSistema` (spec 026: duplica un sistema entero bajo un id y un
  nombre nuevos; mismas reglas de nombre que `crearSistema`/`renombrarSistema`).
- `sistema-recepcion.ts` — `guardarFormacion`, `sistemaCompleto`, `borrarRotacion`,
  `explicarRotacion`, `explicarJugador`.
- `sistema-por-defecto.ts` — `sistemaPorDefecto(plantilla): Sistema` (spec 025, ADR 0021): el
  sistema de recepción a 3 en 5-1 de `docs/voley/Guia_Sistema_Recepcion_3_Esquema_5-1.md`. En la
  v1 arrancaba la app con él si el navegador no tenía nada guardado; desde la spec 033, es
  `server/src/infraestructura/semilla.ts` quien siembra este mismo sistema en PostgreSQL
  (`npm run seed`), no un adaptador de `infrastructure/`. Deriva el roster de cada rotación con
  `jugadoresEnPista`; solo declara puntos y textos por posición rotacional.
- `sistema-defensa-por-defecto.ts` — `sistemaDefensaPorDefecto(plantilla): Sistema` (spec 030):
  el sistema defensivo de `docs/voley/sistema_defensivo_unificado.md`, sembrado junto al de
  recepción. Coloca **por zona física del campo, derivada del rol y de la línea** (líbero a la 5,
  receptor zaguero a la 6, colocador u opuesto a la 1; central a la 3, receptor delantero a la 4,
  colocador u opuesto a la 2), nunca por posición rotacional — de ahí que la geometría se declare
  una sola vez por (zona, vía) y valga para las seis rotaciones. Es lo que distingue esta spec de
  la 029, descartada por colocar por P1..P6.
- `puertos.ts` — las interfaces `SistemaRepository` y `AjustesRepository`, sin implementación.
  Asíncronas las dos; `SistemaRepository` además es granular —`crear`/`actualizar`/`borrar` por
  sistema, nunca un `guardar` de todo el catálogo— para que una escritura no pueda arriesgar el
  trabajo de un sistema que no tocó (spec 031, ADR 0024). También declara `ErrorDeRed`,
  `ErrorDelServidor` y `ConflictoDeEdicion` (spec 034): los tres motivos de fallo que un
  adaptador puede señalar al escribir, parte del contrato del puerto — no un detalle de cómo lo
  cumple un adaptador en concreto.

Todo son funciones puras y tipos, con una excepción deliberada: las tres clases de error de
`puertos.ts` no tienen estado propio (heredan de `Error` sin añadir nada), así que siguen sin
fecha ni aleatoriedad — la regla de fondo es esa, no "cero clases". `creadoEn`/`actualizadoEn`
de un sistema no viven aquí, sino en `infrastructure/` (ADR 0012). `cobertura.ts` (huecos y
conflictos derivados de la rejilla) todavía no existe: llega con las specs 014–015 de la hoja
de ruta del README.

**La configuración de roles vive aquí**, no en la UI ni en un fichero de entorno. Cambiar
"Receptor" por "Punta" es cambiar el vocabulario del dominio, y el sitio donde se hace debe
ser evidente para alguien que solo lea `domain/`.

### `application/`

Orquestación y estado de la aplicación con signals. Una única clase, `SistemaStore` — sin
decorador de Angular, instanciable con `new SistemaStore(repositorio, ajustesRepositorio)` y
testeable sin `TestBed` (`sistema.store.spec.ts`). El constructor no hace ninguna E/S (spec 031):
`cargar()` es un método aparte, asíncrono, que hay que llamar y esperar antes de que el store sea
útil — `app.config.ts` lo dispara con `provideAppInitializer`, así que Angular no monta la
aplicación hasta que el catálogo y los ajustes están listos, la misma garantía que antes daba el
constructor síncrono.

- Escribibles: `sistemas` (catálogo completo, de los dos equipos), `equipoActivo` (spec 032,
  masculino por defecto), `sistemaActivoId`, `rotacionActiva`, `viaActiva`
  (spec 021, solo relevante en sistemas de defensa), `borrador` (la formación en edición, antes
  de guardar), `cambioPendiente` (aviso de cambios sin guardar al cambiar de rotación, de vía, de
  sistema o de equipo), `jugadorSeleccionadoId`, `errorGuardado` (spec 034, ADR 0026: motivo de
  la última escritura fallida y cómo reintentarla, o `null`).
- Derivados con `computed`: `catalogo` (los sistemas de `equipoActivo`, ordenados — spec 032),
  `sistemaActivo`, `posicionesActivas` (quién
  juega de verdad en la rotación activa — titular o líbero, vía `jugadoresEnPista`),
  `formacionGuardadaActiva` (lee `formaciones[rotacion]` en recepción, `defensas[rotacion][via]`
  en defensa), `hayCambiosSinGuardar`, `resultadoValidacion` (siempre `null` en defensa: no es
  que la validación esté desactivada, es que no existe), `puedeGuardar` (en defensa, solo exige
  los seis colocados), `explicacionMostrada` (la del jugador seleccionado, o si no hay ninguno
  la de la rotación), `descripcionSistemaActivo` (spec 025: la descripción general del sistema
  activo, o cadena vacía si no tiene), `celdasJugadorSeleccionado` (spec 024: las celdas del
  jugador seleccionado, o su bloque por defecto si no tiene ninguna; siempre vacío fuera de
  defensa).
- Acciones: `activarSistema`, `seleccionarEquipo` (spec 032, mismo aviso de cambios sin guardar
  que las demás; activa el primero del catálogo del equipo nuevo, o ninguno si está vacío),
  `seleccionarRotacion`, `seleccionarVia`,
  `confirmarCambio`/`cancelarCambio`, `colocarOMover` (conserva `celdas` y `explicacion` de la
  colocación previa), `quitar`, `vaciar`, `pintarCelda`/`borrarCelda` (marcan o quitan una celda
  de la rejilla de responsabilidad de un jugador en el borrador, spec 022; si `celdas` era
  `undefined`, parten del bloque por defecto en vez de vacío — spec 024, así que pintar o borrar
  cualquiera de sus celdas materializa y congela la zona en vez de sustituirla), `guardar` (en
  defensa llama a `guardarFormacionDefensa` en vez de `guardarFormacion`), `crear` (recibe el
  equipo del sistema nuevo, spec 032; cambia `equipoActivo` si es distinto del que ya estaba
  activo, para que el sistema recién creado se vea de inmediato), `clonar`
  (spec 026, mismo patrón que `crear` pero a partir del sistema activo; mantiene su equipo, sin
  parámetro propio), `renombrarActivo`,
  `borrar`, `seleccionarJugador` (toggle: toca a la misma ficha deselecciona, a otra cambia el
  foco — spec 010), `enfocarJugador` (selecciona sin toggle, spec 027: se usa al terminar un
  arrastre que coloca una ficha), `deseleccionarJugador` (spec 027: pinchar el fondo cuando no
  tiene ya otro trabajo asignado — pintar zona, en defensa), `guardarExplicacion`,
  `guardarDescripcion` (spec 025), `cambiarSustitutoLibero`. `quitar` también deselecciona si el
  jugador quitado era el seleccionado (spec 027). Toda acción que persiste algo es `async` desde
  la spec 031 y llama al método del puerto que corresponde a lo que tocó (`crear`, `actualizar`
  o `borrar`), nunca a uno que reescriba el catálogo entero.

  **La llamada al repositorio va siempre primero (ADR 0026).** Los ocho métodos de escritura
  pasan por un helper común, `ejecutarEscritura(accion, reintentar)`: espera a que el
  repositorio termine y solo entonces muta los signals locales — nunca al revés. Si falla, no
  toca ningún signal de estado y publica el motivo en `errorGuardado: { mensaje, reintentar } |
  null`, para que `ui/` pueda avisar y ofrecer reintentar. No es UI optimista: con
  `localStorage` (que nunca fallaba) mutar antes de esperar era inofensivo, pero con un
  adaptador HTTP real habría dejado ver un cambio como guardado justo antes de perderlo.

Nada de lógica de voleibol aquí. Si aparece un `if` sobre posiciones, pertenece a `domain/`.

### `infrastructure/`

Adaptadores hacia el mundo exterior.

- `HttpSistemaRepository implements SistemaRepository` (spec 034) — **el adaptador en uso**,
  contra la API de `server/`. `fetch` nativo, no `HttpClient` de Angular (mismo criterio que
  `LocalStorageSistemaRepository` corriendo sin DOM: el test sustituye la función global y sigue
  corriendo sin `TestBed`). Traduce cualquier respuesta o excepción a uno de los tres motivos
  que declara el puerto: `ErrorDeRed` (la petición no llegó), `ErrorDelServidor` (el servidor
  respondió con error) o `ConflictoDeEdicion` (409 — alguien más modificó el sistema mientras
  tanto). El testigo de concurrencia (`actualizadoEn`, que el servidor exige como cabecera
  `If-Match` al actualizar) se guarda aquí, en memoria e indexado por id — nunca en el tipo de
  dominio, que sigue sin fechas (ADR 0012).
- `LocalStorageSistemaRepository implements SistemaRepository` — **el adaptador de la v1**, ya
  no cableado en `app.config.ts` desde la spec 034. No se ha retirado: exporta el tipo
  `AlmacenClaveValor`, que `LocalStorageAjustesRepository` sigue usando, y su `.spec.ts`
  documenta el formato persistido de la v1 dentro de la suite en verde. Sobre un
  `AlmacenClaveValor` inyectado (que `localStorage` cumple tal cual — la inyección permite
  testear sin DOM). Recibe también la plantilla real por constructor: en la v1 es una única
  constante de la aplicación, no un dato de dominio (ADR 0013). `crear`, `actualizar` y `borrar`
  (spec 031, ADR 0024) leen el almacén tal y como está en el momento de escribir, nunca desde
  una copia en memoria: así una escritura granular no pierde de vista un sistema que otra
  escritura hubiera guardado mientras tanto.
- Formato persistido por `LocalStorageSistemaRepository` (histórico — así es como quedaron
  guardados los sistemas hasta la spec 034, y así los sigue leyendo su `.spec.ts`):
  `{ "version": 6, "data": { "sistemas": [...] } }`. Cada sistema persistido guarda
  `creadoEn`/`actualizadoEn`, que no existen en el `Sistema` de dominio (ADR 0012), y
  `sustitutosLibero?: Record<string, string | null>` (a quién sustituye el líbero en cada
  rotación, ausente si no tiene) en vez de la plantilla completa (ADR 0014, forma por rotación
  desde la ADR 0015). Desde la versión 4 (spec 021) también guarda `defensas?`, por rotación y
  por vía — nunca la posición de la ficha rival, solo la vía ya derivada (ADR 0020). Desde la
  versión 5 (spec 025) guarda `descripcion?`. Desde la versión 6 (spec 032) guarda `equipoId`,
  obligatorio. Nada guardado nunca (`bruto === null`): `listar()` siembra `sistemaPorDefecto` y
  `sistemaDefensaPorDefecto` (spec 030), del equipo masculino (spec 032: no hay guía de
  referencia para sembrar también el femenino, que empieza vacío) **y los persiste de
  inmediato** (spec 031), para que una escritura granular posterior los encuentre ya en el
  almacén. Algo presente pero ilegible (JSON roto, o versión distinta a la actual): se siembra
  igual, pero **solo en memoria**, sin tocar el almacén — sobrescribirlo rompería la garantía de
  nunca sobrescribir a ciegas una versión futura desconocida (spec 008, E4). Un payload legible
  con `sistemas: []` sí se respeta como catálogo vacío, no se siembra nada encima (ADR 0021).
  Desde la spec 028, cada posición persistida guarda también `celdas?` (la zona de
  responsabilidad, specs 022/024) — antes se perdía al recargar; no subió la versión porque es
  una lectura/escritura nueva de un campo que antes se ignoraba del todo, no un cambio de
  significado de datos ya existentes. El servidor de `server/` siembra por su cuenta, con su
  propio script (`npm run seed`, ver la sección `server/` más abajo) — no reutiliza esta lógica.
- `LocalStorageAjustesRepository implements AjustesRepository` — **excepción deliberada**: es el
  único adaptador de `localStorage` que sigue en producción. La spec 034 dejó los `Ajustes`
  fuera de alcance a propósito: son preferencias de pantalla por dispositivo (validación
  desactivada, ayuda de posición…), no trabajo de un entrenador que perder, y no hay tabla de
  servidor para ellos todavía (`docs/modelo-de-datos.md` los convierte en columnas de `usuario`,
  que no existe y queda aplazado — ADR 0028, así que este adaptador deja de ser una parada
  intermedia y pasa a ser el definitivo por tiempo indefinido). Mismo patrón (versión + data) que
  `LocalStorageSistemaRepository`, pero bajo su propia clave: los ajustes son globales a la app,
  no de un sistema concreto (ADR 0015). Sigue siendo un único documento de cuatro banderas que
  se reescribe entero en cada `guardar()` (spec 031): no hay nada que la granularidad de
  `SistemaRepository` pudiera arriesgar aquí, solo se volvió asíncrono.
- Exportadores (PNG, JSON): todavía no existen, llegan con la spec 016.

### `ui/`

Componentes standalone de Angular, prefijo `app-` (el que fija `angular.json`).
`ChangeDetectionStrategy.OnPush`, zoneless.

- `ui/pista/` — `Pista` (el SVG, `viewBox` en metros, `puntoDesde`/`contiene`/captura de
  puntero) y `FichaJugador` (`g[appFicha]`, pinta la etiqueta y el punto ya derivados). En
  defensa, también pinta la ficha rival en el punto fijo de la vía activa (ADR 0020). Expone un
  `pointerdown` de fondo (`fondoAgarrado`) para el modo pintar — tanto `FichaJugador` como la
  ficha rival paran la propagación de su propio `pointerdown` para no disparar los dos gestos a
  la vez. Cuando `mostrarZonas` (solo en defensa, spec 024), pinta siempre las celdas de todos
  con una paleta fija de 7 colores (`PALETA_COLORES`) y una leyenda — ya no hay un interruptor
  aparte para verlas (spec 023 quedó revertida por la 024): la del jugador seleccionado
  (`indiceColorSeleccionado`) se ve a plena intensidad y las demás atenuadas. Una celda
  compartida se pinta con un patrón SVG de franjas diagonales, uno por cada combinación de
  colores que aparece.
- `ui/rotaciones/` — `SelectorRotacion` (pestañas R1–R6) y `SelectorVia` (pestañas de vía,
  solo en defensa, spec 021).
- `ui/panel/` — `PaletaJugadores` (banquillo), `PanelValidacion` (badge de falta/aviso),
  `PanelEnsenanza` (explicación de la rotación o del jugador seleccionado, editable; input
  `abierto` opcional, por defecto desplegado — spec 025 lo usa plegado para el panel de
  descripción del sistema). `Tablero` monta dos: uno para `descripcionSistemaActivo` y otro,
  el de siempre, para `explicacionMostrada`.
- `ui/sistemas/` — `BarraSistemas` (desplegable + crear/renombrar/clonar/borrar — el botón de
  clonar, spec 026, deshabilitado sin sistema activo igual que renombrar y borrar; recibe el
  catálogo ya filtrado por equipo, no sabe que existen equipos), `DialogoSistema` (alta, edición
  y clonado — spec 026 añade un tercer modo en `Tablero.dialogoSistema`, reutilizando el
  componente sin cambios: `mostrarTipo` en `false` como al editar, `nombreInicial` con el nombre
  sugerido «‹Original› (copia)»; el campo de equipo, spec 032, comparte esa misma visibilidad —
  ni el tipo ni el equipo cambian una vez creado), `SelectorEquipo` (pestañas del equipo activo,
  spec 032, mismo patrón que `SelectorVia`).
- `ui/comun/` — `DialogoConfirmacion`, reutilizado para "cambios sin guardar" y para confirmar
  el borrado de un sistema.
- `ui/tablero/` — `Tablero`, el shell: consume `SistemaStore` con `inject()`, traduce signals
  a vista y gestiona el arrastre por `PointerEvent` (capturado sobre el `<svg>`, nunca sobre la
  ficha). El modo pintar (spec 022, solo en defensa desde la spec 024) es un segundo gestor de
  `PointerEvent` en paralelo al de arrastre: con un jugador seleccionado, arrastrar sobre el
  fondo de la pista pinta o borra celdas en vez de mover fichas — el primer punto tocado decide
  si el trazo entero pinta o borra, según si esa celda ya era del jugador (vía
  `store.celdasJugadorSeleccionado()`, que ya incluye el bloque por defecto). Al soltar, si el
  trazo se cerró, `celdasDeTrazo` añade las celdas del interior (spec 024, E9-E11). El índice de
  color de cada jugador (`indiceColorDe`) se deriva del mismo orden fijo de roles que ya usan el
  banquillo y la leyenda de etiquetas (`claveOrdenRol`) — nunca se declara ni se guarda.

Los componentes leen signals y emiten intenciones. No calculan nada del dominio, ni siquiera
la etiqueta de una ficha — con dos excepciones deliberadas: `Tablero` distingue un toque de un
arrastre por la distancia en píxeles de pantalla entre agarrar y soltar (spec 010), y decide si
un trazo de pintado pinta o borra por el mismo motivo — son distinciones de interacción, no de
voleibol.

`src/app/maqueta/` sigue existiendo como boceto congelado: no se borra, pero desde la spec 009
`app.html` ya no la renderiza. Sirve de referencia visual, no se toca.

### `server/`

Proyecto Node aparte, con su propio `package.json` y `node_modules` (spec 033). API REST con
Express 5 que guarda y sirve sistemas en PostgreSQL vía Prisma. **Importa `src/app/domain/`
directamente, con rutas relativas — nunca al revés, y nunca de `application/`, `infrastructure/`
ni `ui/`** (ADR 0025, invariante 8 de `CLAUDE.md`): es el mismo dominio que corre en el
navegador, ejecutándose en Node.

- `src/http/servidor.ts` — fábrica del servidor Express (`crearServidor()`, sin escuchar puerto:
  eso lo hace `src/main.ts`, y los tests de integración levantan su propia instancia efímera).
  CORS escrito a mano (tres cabeceras y una respuesta corta a `OPTIONS`, sin la dependencia
  `cors`), origen permitido configurable por `ORIGEN_PERMITIDO` (`.env`).
- `src/http/sistemas.rutas.ts` — las rutas de `/api/sistemas`, **sin autenticación y aplazada**
  (ADR 0028: las specs 035-037 salen del camino corto, así que la API se queda abierta — vale en
  local, no vale expuesta a internet): reciben y devuelven el `Sistema` de dominio tal cual lo
  serializa el cliente, sin
  traducción de forma en la frontera HTTP. `PUT` exige la cabecera `If-Match` con el testigo de
  concurrencia; `409` si caducó.
- `src/infraestructura/prisma.ts`, `sistema.repositorio.ts` — el cliente de Prisma y el
  repositorio que traduce entre las filas de PostgreSQL y el `Sistema` de dominio.
- `src/infraestructura/semilla.ts` — siembra el equipo, el catálogo fijo de jugadores y los dos
  sistemas de ejemplo (`npm run seed`); sustituye a la siembra que hacía
  `LocalStorageSistemaRepository.listar()` en la v1.
- `prisma/schema.prisma` y `prisma/migrations/` — el esquema completo está en
  `docs/modelo-de-datos.md`. Los `CHECK` y la función `celdas_validas()` no se expresan en el
  lenguaje de esquema de Prisma: van a mano en el SQL de la migración.

Arranque, tests y la lista completa de rutas están en `server/README.md`, no se duplican aquí.

## Estructura de carpetas

```
src/app/
├── domain/
│   ├── modelos.ts
│   ├── roles.ts
│   ├── equipos.ts
│   ├── rotacion.ts
│   ├── plantilla.ts
│   ├── plantillas-equipo.ts
│   ├── plantilla-global.ts
│   ├── validacion.ts
│   ├── defensa.ts
│   ├── rejilla.ts
│   ├── catalogo-sistemas.ts
│   ├── sistema-recepcion.ts
│   ├── sistema-defensa.ts
│   ├── sistema-por-defecto.ts
│   ├── sistema-defensa-por-defecto.ts
│   ├── puertos.ts
│   └── *.spec.ts
├── application/
│   ├── sistema.store.ts
│   └── sistema.store.spec.ts
├── infrastructure/
│   ├── http-sistema.repository.ts          # en uso (spec 034)
│   ├── local-storage-sistema.repository.ts  # legado de la v1, ver `infrastructure/` arriba
│   ├── local-storage-ajustes.repository.ts  # en uso, excepción deliberada
│   └── *.spec.ts
├── ui/
│   ├── tablero/
│   ├── pista/
│   ├── rotaciones/
│   ├── panel/
│   ├── sistemas/
│   ├── ajustes/
│   └── comun/
└── maqueta/        # boceto congelado, no se renderiza ni se borra

server/
├── prisma/
│   ├── schema.prisma
│   └── migrations/       # los CHECK y celdas_validas() están a mano en el SQL
└── src/
    ├── infraestructura/   # Prisma, el repositorio de sistemas, la semilla
    ├── http/               # Express: rutas y la fábrica del servidor
    └── main.ts
```

Los tests viven junto al fichero que prueban, no en una carpeta `test/` paralela.

## Por qué SVG y no Canvas

Para seis fichas, una rejilla y unas líneas, SVG gana en todo lo que importa aquí:
`viewBox` da el responsive gratis sin escuchar `resize`, cada elemento está en el DOM
(inspeccionable, estilable con CSS, accesible, testeable con selectores), y el arrastre son
unos manejadores de `pointer` con captura. Canvas y Fabric.js resuelven un problema que este
proyecto no tiene: un lienzo de dibujo libre con rotaciones, capas y texto editable.

Si algún día el entrenador tiene que dibujar flechas a mano alzada, se reevalúa. Ver
`docs/decisiones/0003-svg-en-lugar-de-canvas.md`.

## Sobre las abstracciones

Solo hay una abstracción especulativa permitida en el proyecto: `SistemaRepository`. La apuesta
se cobró — el segundo adaptador (HTTP, spec 034) existe y es hoy el que está en producción — y
poder testear sin `localStorage` tuvo valor desde el principio, con o sin ese segundo
adaptador.

No se crean interfaces con una sola implementación "por si acaso". En particular, **no hay
adaptador de renderizado**: el SVG se deriva de los signals, así que no existe el problema
de sincronizar dos estados que un adaptador de canvas vendría a resolver.
