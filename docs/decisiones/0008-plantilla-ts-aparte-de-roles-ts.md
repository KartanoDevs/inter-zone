# 0008 — `plantilla.ts` como fichero de dominio aparte de `roles.ts`

**Estado:** Aceptada

**Contexto.** Al implementar la spec 002, `docs/arquitectura.md` solo preveía `roles.ts` para
la configuración de roles y `etiquetaDe()`. Los escenarios E7–E15 validan algo distinto: que
un `OrdenSaque` completo (seis jugadores) tenga índices consistentes, una composición de roles
válida (con o sin líbero) y ningún jugador repetido. Mezclarlo en `roles.ts` habría juntado
"cómo se nombra y abrevia un rol" con "es válida esta plantilla de seis jugadores", dos
preguntas distintas con consumidores distintos.

**Decisión.** `src/app/domain/plantilla.ts`, con `validarPlantilla(orden, configuracion)` y
`asignarIndices(orden, configuracion)`. Reutiliza `rotar()` de `rotacion.ts` para recorrer el
orden de saque en sentido de rotación desde el colocador, tal como describe la convención de
índice en `docs/dominio.md` y la decisión 0006.

**Consecuencias.** `roles.ts` queda centrado solo en configuración y etiqueta. Se asume que
`Jugador.indice` es un dato almacenado (no derivado): `validarPlantilla` necesita poder
recibir plantillas con índices ya asignados, incluidos casos inválidos a propósito (E7–E9), lo
que no tiene sentido si el índice fuera siempre correcto por construcción. `asignarIndices` es
una utilidad para poblarlo según la convención, no la única fuente de verdad. Si más adelante
se decide que el índice debe derivarse siempre (como la posición rotacional o la etiqueta),
esta decisión y `validarPlantilla` habrá que revisarlas juntas.
