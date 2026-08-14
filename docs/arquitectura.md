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
  `TipoSistema`, `Sistema`, `Colocacion`, `Formacion`, `Infraccion`, `Aviso`,
  `ResultadoValidacion`.
- `roles.ts` — configuración de roles por defecto y `etiquetaDe()`.
- `rotacion.ts` — `rotar`, `formacionEnRotacion`, `rotacionDe`: deriva las posiciones
  rotacionales ancladas al colocador (ADR 0010).
- `plantilla.ts` — `validarPlantilla`, `asignarIndices`: composición y numeración de una
  plantilla de seis.
- `plantillas-equipo.ts` — `puedeCrearPlantillaEquipo`, `puedeBorrarPlantillaEquipo`.
- `plantilla-global.ts` — la única plantilla real de la v1 (dos variantes, central2/líbero).
  Configuración por defecto, igual que `roles.ts` (ADR 0013).
- `validacion.ts` — `validarFormacion(formacion, orden, rotacion): ResultadoValidacion`.
- `catalogo-sistemas.ts` — `crearSistema`, `renombrarSistema`, `borrarSistema`,
  `ordenarCatalogo`, `cambiarPlantilla` (ADR 0011).
- `sistema-recepcion.ts` — `guardarFormacion`, `sistemaCompleto`, `borrarRotacion`,
  `explicarRotacion`, `explicarJugador`.
- `puertos.ts` — la interfaz `SistemaRepository`, sin implementación.

Todo son funciones puras y tipos. Sin clases con estado, sin fechas, sin aleatoriedad — por
eso `creadoEn`/`actualizadoEn` de un sistema no viven aquí, sino en `infrastructure/` (ADR
0012). `rejilla.ts` y `cobertura.ts` (conversión a celdas, huecos y conflictos) todavía no
existen: llegan con las specs 013–014 de la hoja de ruta del README.

**La configuración de roles vive aquí**, no en la UI ni en un fichero de entorno. Cambiar
"Receptor" por "Punta" es cambiar el vocabulario del dominio, y el sitio donde se hace debe
ser evidente para alguien que solo lea `domain/`.

### `application/`

Orquestación y estado de la aplicación con signals. Una única clase, `SistemaStore` — sin
decorador de Angular, instanciable con `new SistemaStore(repositorio)` y testeable sin
`TestBed` (`sistema.store.spec.ts`).

- Escribibles: `sistemas` (catálogo completo), `sistemaActivoId`, `rotacionActiva`,
  `borrador` (la formación en edición, antes de guardar), `cambioPendiente` (aviso de cambios
  sin guardar al cambiar de rotación o de sistema), `jugadorSeleccionadoId`.
- Derivados con `computed`: `catalogo` (ordenado), `sistemaActivo`, `ordenActivo`,
  `formacionGuardadaActiva`, `hayCambiosSinGuardar`, `resultadoValidacion`, `puedeGuardar`,
  `explicacionMostrada` (la del jugador seleccionado, o si no hay ninguno la de la rotación).
- Acciones: `activarSistema`, `seleccionarRotacion`, `confirmarCambio`/`cancelarCambio`,
  `colocarOMover`, `quitar`, `vaciar`, `guardar`, `crear`, `renombrarActivo`, `borrar`,
  `seleccionarJugador`, `guardarExplicacion`.

Nada de lógica de voleibol aquí. Si aparece un `if` sobre posiciones, pertenece a `domain/`.

### `infrastructure/`

Adaptadores hacia el mundo exterior.

- `LocalStorageSistemaRepository implements SistemaRepository`, sobre un `AlmacenClaveValor`
  inyectado (que `localStorage` cumple tal cual — la inyección permite testear sin DOM).
  Recibe también las dos variantes de plantilla por constructor: en la v1 son una constante de
  la aplicación, no un dato de dominio (ADR 0013).
- Formato persistido: `{ "version": 1, "data": { "sistemas": [...] } }`. Cada sistema
  persistido guarda `creadoEn`/`actualizadoEn`, que no existen en el `Sistema` de dominio (ADR
  0012), y `ocupanteCasilla` en vez de la plantilla completa.
- Exportadores (PNG, JSON): todavía no existen, llegan con la spec 015.

### `ui/`

Componentes standalone de Angular, prefijo `app-` (el que fija `angular.json`).
`ChangeDetectionStrategy.OnPush`, zoneless.

- `ui/pista/` — `Pista` (el SVG, `viewBox` en metros, `puntoDesde`/`contiene`/captura de
  puntero) y `FichaJugador` (`g[appFicha]`, pinta la etiqueta y el punto ya derivados).
- `ui/rotaciones/` — `SelectorRotacion`, las pestañas R1–R6.
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
│   ├── catalogo-sistemas.ts
│   ├── sistema-recepcion.ts
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
`docs/decisiones.md`, decisión 0003.

## Sobre las abstracciones

Solo hay una abstracción especulativa permitida en el proyecto: `SistemaRepository`, porque
sabemos que habrá un segundo adaptador (HTTP) y porque poder testear sin `localStorage`
tiene valor hoy.

No se crean interfaces con una sola implementación "por si acaso". En particular, **no hay
adaptador de renderizado**: el SVG se deriva de los signals, así que no existe el problema
de sincronizar dos estados que un adaptador de canvas vendría a resolver.
