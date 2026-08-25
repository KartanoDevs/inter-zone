# 047 — Sin bloque por defecto al seleccionar en defensa

**Estado:** Completada
**Paso de la hoja de ruta:** 7 (sistemas de defensa)

## Problema

La spec 024 (E3) hace que seleccionar un puesto en defensa muestre, ya marcado, un bloque de
2×2 celdas junto a su ficha, antes de que el entrenador pinte nada. En uso real molesta: aparece
una zona que nadie pidió, hay que borrarla a mano si no aplica, y confunde qué está guardado de
verdad frente a lo que la app propone.

## Objetivo

Seleccionar un puesto en defensa no muestra ninguna zona de defensa hasta que el entrenador
pinta la primera celda. Mismo criterio que ya tiene la zona de finta (spec 041, E8), que nunca
tuvo bloque por defecto.

**Esta spec toca `application/`.** No toca `domain/`: `bloquePorDefecto` (`domain/rejilla.ts`)
sigue existiendo tal cual, con sus propios tests — deja de tener quien la llame desde
`application/`, pero la spec 022/024 que la define no se revierte en el dominio, solo su uso en
la zona de defensa.

## Fuera de alcance

- **`domain/rejilla.ts` no se toca.** `bloquePorDefecto` se queda como función pura disponible,
  por si una spec futura la necesita en otro sitio.
- **Zona de finta:** ya no tenía bloque por defecto (spec 041, E8); esta spec no le cambia nada.
- **Recepción:** `celdasJugadorSeleccionado` ya devolvía `[]` fuera de defensa (spec 024, E1);
  sigue igual.
- **Borrar el bloque por defecto ya guardado en sistemas antiguos:** si una variante ya tiene
  `celdas` guardadas (con valores, de cuando sí existía el bloque por defecto), se siguen
  mostrando tal cual — esta spec solo cambia qué se ve **antes** de pintar nada, no lo que ya
  estaba pintado.

## Escenarios

**E1 — Seleccionar un puesto sin celdas pintadas no muestra ninguna zona**
- Dado: un puesto de defensa seleccionado, sin ninguna celda propia pintada todavía
- Cuando: se mira el campo
- Entonces: no se ve ninguna celda marcada como su zona de defensa

**E2 — Pintar la primera celda la añade sola, no un bloque de cuatro**
- Dado: un puesto seleccionado sin celdas pintadas
- Cuando: se pinta una celda
- Entonces: queda marcada exactamente esa celda, no un bloque de 2×2 alrededor

**E3 — Borrar sin haber pintado nada no hace nada**
- Dado: un puesto seleccionado sin celdas pintadas
- Cuando: se intenta borrar una celda
- Entonces: sigue sin tener ninguna celda — no hay bloque por defecto del que partir para quitar
  una

**E4 — Una zona ya guardada se sigue mostrando igual**
- Dado: un puesto con celdas ya guardadas (pintadas antes de esta spec, o después)
- Cuando: se selecciona
- Entonces: se ven exactamente esas celdas, sin cambios

## Preguntas abiertas

Ninguna.

## Al cerrar

Los 4 escenarios pasan. Suite: 329 tests al arrancar esta spec (cierre de la 046, más el
addendum de navegación al toque) → 330 al cerrarla: los cuatro tests de "zona por defecto (spec
024)" que cubrían el bloque en defensa se reescribieron para el comportamiento nuevo (024-E3,
E5, E6, E7 pasan a 047-E1/E2/E3, con un test añadido para el caso de mover sin haber pintado), y
se sumó uno nuevo para E4 (zona ya guardada, sin tocar). `npm run typecheck` y `npm run build`
limpios; servidor de desarrollo recompiló sin errores.

**Cambio no pedido explícitamente pero necesario para llegar a cero avisos, hecho a la vez:**
mientras se implementaba esta spec, el usuario pidió en la misma sesión un ajuste relacionado
—que soltar un arrastre en defensa tampoco fuerce la pestaña Enseñanza, generalizando el
addendum de la spec 046 (que hasta ahora solo cubría el toque de selección, no el arrastre)—.
Se aplicó en el mismo cambio: `ui/tablero/tablero.ts`, la rama de `soltar` que reposiciona una
ficha ya en pista sigue llamando a `enfocarJugador` en los dos modos (mantiene la selección,
spec 027, E1) pero solo llama a `irAEnsenanza()` fuera de defensa.

**`domain/rejilla.ts` no se tocó, tal y como fijaba el alcance.** `bloquePorDefecto` sigue
exportada, con sus tests de `rejilla.spec.ts` intactos — solo dejó de tener consumidores en
`application/sistema.store.ts`. No se borró: sigue siendo una función pura correcta, y no hay
ninguna razón de dominio para retirarla, solo dejó de encajar en este flujo de UI concreto.

**Ningún ADR nuevo:** revertir un valor por defecto de pantalla no es una decisión estructural
que necesite explicarse fuera de esta spec y del comentario ya actualizado en
`celdasJugadorSeleccionado`, `pintarCelda` y `borrarCelda`.

**Lo que no se desvió:** el alcance previsto (solo `application/`, sin tocar `domain/`, sin
tocar la zona de finta ni las zonas ya guardadas) se cumplió tal cual.
