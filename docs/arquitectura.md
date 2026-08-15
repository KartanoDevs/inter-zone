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
```

Las flechas apuntan solo hacia dentro. `domain/` no conoce a nadie. `infrastructure/`
implementa puertos que se **declaran** en `domain/`.

## Capas

### `domain/`

Modelos y reglas. Aquí vive el voleibol.

- `modelos.ts` — `Punto`, `Jugador`, `RolId`, `DefinicionRol`, `OrdenSaque`, `PlantillaEquipo`,
  `TipoSistema`, `ViaAtaque`, `Sistema` (con `formaciones` para recepción y `defensas` —por
  rotación y por vía, spec 021— para defensa), `Colocacion`, `Formacion`, `Infraccion`, `Aviso`,
  `ResultadoValidacion`.
- `roles.ts` — configuración de roles por defecto y `etiquetaDe()`.
- `rotacion.ts` — `rotar`, `formacionEnRotacion`, `rotacionDe`: deriva las posiciones
  rotacionales ancladas al colocador (ADR 0010). `jugadoresEnPista(plantilla, rotacion)`
  deriva quién juega de verdad — el líbero en vez del titular si le toca zaga (ADR 0014).
  `zaguerosEnRotacion(orden, rotacion)` deriva quiénes ocupan P1/P5/P6 en una rotación; la usan
  tanto `sustitutosLiberoPorDefecto` como la UI para filtrar el selector del líbero.
- `defensa.ts` — `viaDeAtaque(punto): ViaAtaque`: deriva la vía de ataque (zona 4/3/2/pipe) de
  un punto del campo rival, con el espejo de zonas ya resuelto (spec 021, ver `docs/dominio.md`
  §3). Función pura, sin estado.
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
  formación con el roster que le toca en su propia rotación — ADR 0014).
- `sistema-recepcion.ts` — `guardarFormacion`, `sistemaCompleto`, `borrarRotacion`,
  `explicarRotacion`, `explicarJugador`.
- `puertos.ts` — la interfaz `SistemaRepository`, sin implementación.

Todo son funciones puras y tipos. Sin clases con estado, sin fechas, sin aleatoriedad — por
eso `creadoEn`/`actualizadoEn` de un sistema no viven aquí, sino en `infrastructure/` (ADR
0012). `rejilla.ts` y `cobertura.ts` (conversión a celdas, huecos y conflictos) todavía no
existen: llegan con las specs 014–015 de la hoja de ruta del README.

**La configuración de roles vive aquí**, no en la UI ni en un fichero de entorno. Cambiar
"Receptor" por "Punta" es cambiar el vocabulario del dominio, y el sitio donde se hace debe
ser evidente para alguien que solo lea `domain/`.

### `application/`

Orquestación y estado de la aplicación con signals. Una única clase, `SistemaStore` — sin
decorador de Angular, instanciable con `new SistemaStore(repositorio)` y testeable sin
`TestBed` (`sistema.store.spec.ts`).

- Escribibles: `sistemas` (catálogo completo), `sistemaActivoId`, `rotacionActiva`, `viaActiva`
  (spec 021, solo relevante en sistemas de defensa), `borrador` (la formación en edición, antes
  de guardar), `cambioPendiente` (aviso de cambios sin guardar al cambiar de rotación, de vía o
  de sistema), `jugadorSeleccionadoId`.
- Derivados con `computed`: `catalogo` (ordenado), `sistemaActivo`, `posicionesActivas` (quién
  juega de verdad en la rotación activa — titular o líbero, vía `jugadoresEnPista`),
  `formacionGuardadaActiva` (lee `formaciones[rotacion]` en recepción, `defensas[rotacion][via]`
  en defensa), `hayCambiosSinGuardar`, `resultadoValidacion` (siempre `null` en defensa: no es
  que la validación esté desactivada, es que no existe), `puedeGuardar` (en defensa, solo exige
  los seis colocados), `explicacionMostrada` (la del jugador seleccionado, o si no hay ninguno
  la de la rotación).
- Acciones: `activarSistema`, `seleccionarRotacion`, `seleccionarVia`,
  `confirmarCambio`/`cancelarCambio`, `colocarOMover`, `quitar`, `vaciar`, `guardar` (en
  defensa llama a `guardarFormacionDefensa` en vez de `guardarFormacion`), `crear`,
  `renombrarActivo`, `borrar`, `seleccionarJugador`, `guardarExplicacion`,
  `cambiarSustitutoLibero`.

Nada de lógica de voleibol aquí. Si aparece un `if` sobre posiciones, pertenece a `domain/`.

### `infrastructure/`

Adaptadores hacia el mundo exterior.

- `LocalStorageSistemaRepository implements SistemaRepository`, sobre un `AlmacenClaveValor`
  inyectado (que `localStorage` cumple tal cual — la inyección permite testear sin DOM).
  Recibe también la plantilla real por constructor: en la v1 es una única constante de la
  aplicación, no un dato de dominio (ADR 0013).
- Formato persistido: `{ "version": 4, "data": { "sistemas": [...] } }`. Cada sistema
  persistido guarda `creadoEn`/`actualizadoEn`, que no existen en el `Sistema` de dominio (ADR
  0012), y `sustitutosLibero?: Record<string, string | null>` (a quién sustituye el líbero en
  cada rotación, ausente si no tiene) en vez de la plantilla completa (ADR 0014, forma por
  rotación desde la ADR 0015). Desde la versión 4 (spec 021) también guarda `defensas?`, por
  rotación y por vía — nunca la posición de la ficha rival, solo la vía ya derivada (ADR 0020).
- `LocalStorageAjustesRepository implements AjustesRepository`, mismo patrón (versión + data)
  pero bajo su propia clave: los ajustes (por ahora, si la validación de posiciones está
  desactivada) son globales a la app, no de un sistema concreto (ADR 0015).
- Exportadores (PNG, JSON): todavía no existen, llegan con la spec 016.

### `ui/`

Componentes standalone de Angular, prefijo `app-` (el que fija `angular.json`).
`ChangeDetectionStrategy.OnPush`, zoneless.

- `ui/pista/` — `Pista` (el SVG, `viewBox` en metros, `puntoDesde`/`contiene`/captura de
  puntero) y `FichaJugador` (`g[appFicha]`, pinta la etiqueta y el punto ya derivados). En
  defensa, también pinta la ficha rival en el punto fijo de la vía activa (ADR 0020).
- `ui/rotaciones/` — `SelectorRotacion` (pestañas R1–R6) y `SelectorVia` (pestañas de vía,
  solo en defensa, spec 021).
- `ui/panel/` — `PaletaJugadores` (banquillo), `PanelValidacion` (badge de falta/aviso),
  `PanelEnsenanza` (explicación de la rotación o del jugador seleccionado, editable).
- `ui/sistemas/` — `BarraSistemas` (desplegable + crear/renombrar/borrar), `DialogoSistema`
  (alta y edición).
- `ui/comun/` — `DialogoConfirmacion`, reutilizado para "cambios sin guardar" y para confirmar
  el borrado de un sistema.
- `ui/tablero/` — `Tablero`, el shell: consume `SistemaStore` con `inject()`, traduce signals
  a vista y gestiona el arrastre por `PointerEvent` (capturado sobre el `<svg>`, nunca sobre la
  ficha).

Los componentes leen signals y emiten intenciones. No calculan nada del dominio, ni siquiera
la etiqueta de una ficha — con una única excepción deliberada: `Tablero` distingue un toque de
un arrastre por la distancia en píxeles de pantalla entre agarrar y soltar (spec 010), porque
esa distinción es de interacción, no de voleibol.

`src/app/maqueta/` sigue existiendo como boceto congelado: no se borra, pero desde la spec 009
`app.html` ya no la renderiza. Sirve de referencia visual, no se toca.

## Estructura de carpetas

```
src/app/
├── domain/
│   ├── modelos.ts
│   ├── roles.ts
│   ├── rotacion.ts
│   ├── plantilla.ts
│   ├── plantillas-equipo.ts
│   ├── plantilla-global.ts
│   ├── validacion.ts
│   ├── defensa.ts
│   ├── catalogo-sistemas.ts
│   ├── sistema-recepcion.ts
│   ├── sistema-defensa.ts
│   ├── puertos.ts
│   └── *.spec.ts
├── application/
│   ├── sistema.store.ts
│   └── sistema.store.spec.ts
├── infrastructure/
│   ├── local-storage-sistema.repository.ts
│   └── local-storage-sistema.repository.spec.ts
├── ui/
│   ├── tablero/
│   ├── pista/
│   ├── rotaciones/
│   ├── panel/
│   ├── sistemas/
│   └── comun/
└── maqueta/        # boceto congelado, no se renderiza ni se borra
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

Solo hay una abstracción especulativa permitida en el proyecto: `SistemaRepository`, porque
sabemos que habrá un segundo adaptador (HTTP) y porque poder testear sin `localStorage`
tiene valor hoy.

No se crean interfaces con una sola implementación "por si acaso". En particular, **no hay
adaptador de renderizado**: el SVG se deriva de los signals, así que no existe el problema
de sincronizar dos estados que un adaptador de canvas vendría a resolver.
