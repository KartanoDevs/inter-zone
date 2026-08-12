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

- `modelos.ts` — `Punto`, `Jugador`, `RolId`, `DefinicionRol`, `Equipo`, `OrdenSaque`,
  `Colocacion`, `Formacion`, `Sistema`, `Infraccion`.
- `roles.ts` — configuración de roles por defecto y `etiquetaDe()`.
- `rotacion.ts` — `rotar(orden, rotacion)`, deriva las posiciones rotacionales.
- `validacion.ts` — `validarFormacion(formacion, orden, equipo): Infraccion[]`.
- `rejilla.ts` — conversión entre metros y `CeldaId`, límites, pertenencia al campo.
- `cobertura.ts` — mapa inverso, huecos, conflictos.
- `puertos.ts` — la interfaz `SistemaRepository`, sin implementación.

Todo son funciones puras y tipos. Sin clases con estado, sin fechas, sin aleatoriedad.

**La configuración de roles vive aquí**, no en la UI ni en un fichero de entorno. Cambiar
"Receptor" por "Punta" es cambiar el vocabulario del dominio, y el sitio donde se hace debe
ser evidente para alguien que solo lea `domain/`.

### `application/`

Orquestación y estado de la aplicación con signals.

- `SistemaStore`: escribibles `sistema`, `equipo`, `rotacionActiva`, `jugadorSeleccionado`,
  `modo`.
- Derivados con `computed`: `formacionActual`, `infracciones`, `etiquetas`, `mapaCobertura`,
  `huecos`, `conflictos`.
- Casos de uso: `cargarSistema`, `guardarSistema`, `moverJugador`, `pintarCeldas`.

Nada de lógica de voleibol aquí. Si aparece un `if` sobre posiciones, pertenece a `domain/`.

### `infrastructure/`

Adaptadores hacia el mundo exterior.

- `LocalStorageSistemaRepository implements SistemaRepository`.
- Formato persistido: `{ "version": 1, "data": { ... } }`. La `version` está desde el
  primer día y existe una función `migrar()` aunque hoy sea la identidad.
- Exportadores: PNG (serializando el SVG) y JSON.

### `ui/`

Componentes standalone de Angular. `ChangeDetectionStrategy.OnPush`, zoneless.

- `PistaComponent` — el SVG, con `viewBox` en metros y `width="100%"`. El escalado responsive
  lo hace el navegador; no hay código de `resize`.
- `FichaJugadorComponent` — pinta la etiqueta derivada (`R1`, `M2`, `C`...).
- `RejillaComponent`, `PanelValidacionComponent`, `SelectorRotacionComponent`.

Los componentes leen signals y emiten intenciones. No calculan nada del dominio, ni siquiera
la etiqueta de una ficha.

## Estructura de carpetas

```
src/app/
├── domain/
│   ├── modelos.ts
│   ├── roles.ts
│   ├── rotacion.ts
│   ├── validacion.ts
│   ├── rejilla.ts
│   ├── cobertura.ts
│   ├── puertos.ts
│   └── *.spec.ts
├── application/
│   ├── sistema.store.ts
│   └── *.spec.ts
├── infrastructure/
│   └── local-storage-sistema.repository.ts
└── ui/
    ├── pista/
    ├── panel/
    └── rotaciones/
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
