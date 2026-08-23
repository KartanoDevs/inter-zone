# 0029 — Los puestos de defensa son genéricos: tipo paralelo, no jugadores

**Estado:** Aceptada

**Contexto.** La spec 038 sustituye la rotación por el caso del colocador rival como eje de
navegación en defensa. Consecuencia directa: los seis defensores dejan de ser jugadores
concretos de una plantilla y pasan a ser seis puestos genéricos del campo propio (1..6), porque
ya no hay ninguna rotación de la que derivar quién ocupa cada uno.

`Colocacion` (`domain/modelos.ts`) llevaba un `Jugador` obligatorio, y todo lo que trabajaba con
una `Formacion` —el store, `sistema-recepcion.ts`, `validacion.ts`, la UI— asumía que siempre
había un jugador al que preguntar el rol, el id, el índice. Había que decidir cómo representar
"un puesto sin jugador" sin romper esa garantía en recepción, que no cambia con esta spec.

**Alternativas consideradas.**

1. **Ocupante discriminado dentro de `Colocacion`** (`jugador?: Jugador; puesto?: PuestoDefensa`,
   o una unión `{ jugador: Jugador } | { puesto: PuestoDefensa }` con el resto de campos
   compartidos). Hace representable un estado que nunca debe existir —una formación de recepción
   con puestos, o una de defensa con jugadores— y pierde en compilación la garantía que hoy es
   gratis: `validarFormacion` y `sistema-recepcion.ts` tendrían que volver a comprobar en tiempo
   de ejecución algo que el tipo ya aseguraba. En base de datos exige `jugador_id` nullable, una
   columna `puesto` nueva, un CHECK XOR entre las dos, y rehacer la PK compuesta de `colocacion`
   (que no admite NULL). Y en el cliente, los ~55 tests de recepción de `sistema.store.spec.ts`
   habrían cambiado de forma aunque su escenario no cambiara — solo por el tipo, no por
   comportamiento.
2. **Pseudo-jugadores con id estable** (`{ id: 'puesto-1', rol: '???' }` insertados en el
   catálogo). `Jugador.rol` solo admite los cinco roles reales; "C/O" no es uno de ellos, así que
   habría que inventar un rol falso o repetir uno existente, y entonces `etiquetaDe`,
   `indiceColorDe` (paleta por rol e índice) y `validarConfiguracionRoles` producirían resultados
   incorrectos sin que ningún tipo lo señalara. En el servidor, la FK
   `colocacion.jugador_id → jugador(id)` habría exigido sembrar seis filas falsas en una tabla que
   `docs/modelo-de-datos.md` §5 define explícitamente como "los siete huecos del sistema" —rompe
   el documento, no solo el código—, y `jugadoresEnPista`/`validarFormacion` los habrían aceptado
   en silencio, un fallo latente para el día que lleguen huecos y conflictos (specs 014-015).

**Decisión.** Tipo paralelo, sin tocar `Colocacion`:

```ts
export interface ColocacionDefensa {
  readonly puesto: PuestoDefensa;
  readonly punto: Punto;
  readonly explicacion?: string;
  readonly celdas?: readonly Celda[];
}
export type FormacionDefensa = readonly ColocacionDefensa[];
```

`Colocacion` no se toca en absoluto: sigue exigiendo `jugador`, sigue siendo lo único que ve
`validarFormacion` y `sistema-recepcion.ts`. En base de datos, `colocacion_defensa` es una tabla
nueva con su propia PK `(formacion_id, puesto)`, sin FK a `jugador` — no comparte fila con
`colocacion` ni con la posibilidad de que un puesto "sea" un jugador.

El coste se paga en un único punto de fontanería de UI, deliberadamente fuera de `domain/`: un
identificador string que unifica los dos casos (`idDe`/`idOcupanteDe`, el id del jugador o
`p${puesto}`), usado en `application/sistema.store.ts` y `ui/tablero/tablero.ts` para que
`colocarOMover`, `quitar`, `pintarCelda`, `borrarCelda` y la selección de ocupante funcionen
igual sobre los dos tipos sin necesitar una unión en el dominio.

**Consecuencias.** `Sistema.defensas` deja de ser un `Record` por rotación y vía; pasa a una
lista de `VarianteDefensa` (ver `docs/especificaciones/038-*.md`), cada una con su propia
`FormacionDefensa`. Los ~55 tests de recepción del store no se tocaron; solo los ~15 de defensa,
que había que reescribir de todas formas por el cambio de eje de navegación. `bloquePorDefecto` y
el pintado de celdas se escriben una sola vez sobre un supertipo estructural implícito
(`{ punto; explicacion?; celdas? }`) que ambos tipos satisfacen, sin necesidad de declararlo
explícitamente en `modelos.ts`.
