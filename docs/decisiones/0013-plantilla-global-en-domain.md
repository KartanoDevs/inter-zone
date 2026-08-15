# 0013 — La plantilla global vive en `domain/`; el `SistemaStore` se cablea con `useFactory`

**Estado:** Aceptada

**Contexto.** La spec 009 conecta por primera vez la aplicación real: `app.ts` deja de
renderizar la maqueta y pasa a usar `SistemaStore`, que necesita un `SistemaRepository` de
verdad. `LocalStorageSistemaRepository` (spec 008) recibe las dos variantes de plantilla
(central2/líbero) inyectadas, precisamente porque no existían todavía como dato real de la
aplicación — solo como ejemplo en `maqueta/datos-ejemplo.ts`.

**Decisión.** El roster único de la v1 se declara en `domain/plantilla-global.ts`, con el mismo
estatus que `CONFIGURACION_ROLES_POR_DEFECTO` en `roles.ts`: datos de configuración por
defecto, no una regla de voleibol, pero sí legítimamente domain/ porque son solo tipos y
funciones puras, sin más importación que otros ficheros de `domain/`. `app.config.ts` registra
`SistemaStore` con un proveedor `useFactory` que construye
`new SistemaStore(new LocalStorageSistemaRepository(localStorage, PLANTILLA_GLOBAL))`; los
componentes de `ui/` lo obtienen con `inject(SistemaStore)`. `SistemaStore` en sí no lleva
ningún decorador de Angular: sigue siendo una clase de TypeScript con signals, instanciable y
testeable con `new SistemaStore(repositorioFake)` sin `TestBed`.

**Consecuencias.** Cuando la V2 tenga varias plantillas de verdad, `plantilla-global.ts`
desaparece y su lugar lo ocupa lo que sea que gestione las plantillas por equipo — el
repositorio ya está preparado para recibir cualquier `Record<OcupanteCasilla, PlantillaEquipo>`,
así que ese cambio no le afecta. Las clases de botón compartidas (`.app-boton*`) se movieron de
`tablero.css` (donde vivían solo para la maqueta) a `src/styles.css`, porque Angular encapsula
los estilos por componente y el nuevo diálogo de confirmación las necesita igual que el
tablero.
