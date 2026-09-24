# 075 — El atacante rival se mueve libre por el campo

**Estado:** Completada
**Paso de la hoja de ruta:** 7 (sistemas de defensa)

**Depende de:** spec 072 (el punto del atacante se persiste), completada. Toca directamente el
mecanismo que la spec 072 dejó ligado a `situacionMasCercana` — esta spec lo desliga.

## Problema

Hoy, al soltar la ficha "A" en cualquier punto del campo rival, la aplicación deriva
automáticamente una situación de ataque (`z2`/`z3`/`z4`/`pipe`) a partir del punto exacto donde
se suelta, y cambia la variante activa si ese punto cae en otro tercio del campo. Esto no
corresponde con cómo se lee un ataque real: un atacante que arma por zona 3 puede rematar hacia
2 o hacia 4 según lea el bloqueo, sin que eso cambie contra qué está organizada la defensa. Con
el comportamiento actual, mover la ficha un poco hacia el lateral cambia silenciosamente de
variante — y de formación de los seis puestos — sin que el entrenador lo pida.

## Objetivo

Arrastrar la ficha "A" por el campo rival nunca cambia la variante de defensa activa: el punto
se mueve libremente por todo el campo rival y se guarda dentro de la situación que ya estaba
activa. Cambiar de situación sigue siendo posible, mediante el selector de pestañas que ya
existe (`app-selector-situacion`).

## Fuera de alcance

- **El selector de pestañas de situación** (`app-selector-situacion`, `ui/rotaciones/`): no
  cambia. Sigue siendo la única vía para cambiar de situación de verdad.
- **`situacionMasCercana` y `situacionDelPunto`** (`domain/defensa.ts`): no se tocan ni se
  eliminan. Dejan de invocarse desde `onAgarrarRival`, pero siguen siendo funciones de dominio
  correctas, con sus tests, por si algo más las necesita en el futuro.
- **El punto guardado del central rival, del colocador rival, o de cualquier otra ficha**: esta
  spec habla solo de la ficha "A" (atacante). No hay central rival en el código (revertido).
- **Acotar el arrastre a un subconjunto del campo rival** (por ejemplo, solo al tercio activo).
  El punto se mueve por **todo** el campo rival, con el mismo límite `acotarPuntoRival` de
  siempre (`[0,9] × [-4,0]`) — sin restricción adicional por situación.
- **Cambiar cómo se calcula la sombra de bloqueo** (spec 040): sigue leyendo el punto del
  atacante tal cual, sea cual sea su posición dentro del campo rival.

## Escenarios

**E1 — Mover el atacante dentro de su propio tercio no cambia la situación**
- Dado: una variante activa con situación `z3`
- Cuando: se arrastra la ficha "A" a un punto distinto dentro del mismo tercio (`3 ≤ x < 6`,
  `y > -3`) y se suelta
- Entonces: la situación activa sigue siendo `z3`, y el punto se guarda en esa misma variante

**E2 — Mover el atacante a otro tercio tampoco cambia la situación**
- Dado: una variante activa con situación `z3`
- Cuando: se arrastra la ficha "A" a un punto que caería en el tercio de `z4` (`x ≥ 6`) y se
  suelta
- Entonces: la situación activa sigue siendo `z3` — no cambia a `z4` — y el punto se guarda
  dentro de la variante de `z3`, en ese punto exacto (aunque visualmente esté sobre el tercio de
  `z4`)

**E3 — Mover el atacante a la zona de la pipe tampoco cambia la situación**
- Dado: una variante activa con situación `z4`
- Cuando: se arrastra la ficha "A" a un punto de zaga rival (`y ≤ -3`, zona de la pipe) y se
  suelta
- Entonces: la situación activa sigue siendo `z4`, y el punto se guarda dentro de esa variante

**E4 — El punto sigue acotado al campo rival completo**
- Dado: cualquier variante activa
- Cuando: se intenta soltar la ficha "A" fuera de los límites del campo rival
- Entonces: el punto que se guarda es el acotado a esos límites (`acotarPuntoRival`, sin
  cambios) — mismo comportamiento que hoy

**E5 — El selector de pestañas sigue cambiando de situación**
- Dado: una variante activa con situación `z3`
- Cuando: se pulsa la pestaña de `z4` en el selector de situación
- Entonces: la situación activa cambia a `z4`, con el mismo comportamiento de siempre
  (`seleccionarSituacion`: recarga el borrador, la sombra en edición y el punto del atacante de
  esa variante) — esta spec no toca el selector en absoluto

**E6 — Cada variante conserva su propio punto guardado, sin mezclarse**
- Dado: dos variantes distintas (`z3` y `z4`), cada una con su ficha "A" en un punto distinto
- Cuando: se cambia de una a otra usando el selector de pestañas
- Entonces: cada una muestra su propio punto guardado — mismo comportamiento que ya garantiza la
  spec 072, sin cambios aquí

## Preguntas abiertas

Ninguna.

## Al cerrar

**Sin desviaciones respecto a lo especificado.** El cambio fue mínimo y localizado: en
`onAgarrarRival` (`ui/tablero/tablero.ts`), quitar la llamada a
`store.seleccionarSituacion(situacionMasCercana(...))` del bloque `soltar`, dejando solo
`store.moverAtacante(punto)`. No hizo falta tocar `domain/`, `application/`,
`infrastructure/` ni `server/` — el mecanismo de persistencia del punto (ADR 0047) no cambia en
absoluto, solo deja de disparar un efecto secundario que antes tenía.

**Sin tests nuevos de comportamiento (E1-E4).** Son escenarios de interacción de arrastre en
`ui/tablero/tablero.ts`, y el proyecto no tiene tests de componentes Angular — mismo precedente
ya establecido en las specs 072-074. Se verificaron por inspección directa del código (el
bloque `soltar` ya no contiene ninguna llamada a `seleccionarSituacion` ni a
`situacionMasCercana`, confirmado con `grep`) y quedan pendientes de confirmación visual al
relanzar la app.

**E5 y E6 no generaron cambio ni test**, tal como preveía la spec: son comportamiento ya
garantizado por `SistemaStore.seleccionarSituacion` y `cambiarContexto()`, que no se tocaron.

**`situacionMasCercana` y `situacionDelPunto`** (`domain/defensa.ts`) se quedan tal cual,
correctas y con sus tests existentes — solo se quitó su único punto de invocación desde la UI
(y el import correspondiente en `tablero.ts`, que quedaba huérfano).

**Documentación actualizada además de la spec:** `docs/dominio.md` §3 tenía dos frases
desactualizadas desde la spec 072/ADR 0047 (afirmaban que la posición del atacante "no se
persiste" y "nunca se guarda", cuando llevaba meses persistiéndose) — se corrigieron aquí porque
este cambio las hacía aún más falsas si se dejaban así. Nueva ADR: 0048, que matiza la 0020 sin
tocarla (append-only).

**Verificado:** `npm test` (550/550), `npm run typecheck` (limpio), `ng build
--configuration=production` (limpio, mismo warning preexistente y ajeno de siempre), `npm run
format:check` (limpio). No existe el script `test:coverage`; no se inventa.
