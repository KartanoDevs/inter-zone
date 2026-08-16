# 027 — La selección de jugador sigue al arrastre y se limpia pinchando fuera

**Estado:** Completada
**Paso de la hoja de ruta:** No encaja en ningún paso: precisa la interacción de selección de
jugador que ya introdujo la spec 010 (toque vs. arrastre), no añade una capacidad de dominio.

## Problema

Hoy, terminar de arrastrar una ficha no la deja seleccionada — solo un toque simple (sin
arrastre) selecciona, spec 010 —, así que después de mover a alguien hay que volver a tocarlo
para ver o editar su explicación. Tampoco hay forma de deseleccionar pinchando fuera de las
fichas: solo tocando de nuevo a la ficha ya seleccionada.

## Objetivo

Terminar un arrastre que coloca una ficha en el campo (venga de la pista o del banquillo) la deja
seleccionada. Arrastrar una ficha fuera del campo la quita y, si estaba seleccionada, deja de
estarlo. Pinchar el fondo de la pista deselecciona al jugador actual, cuando el fondo no tiene ya
otro trabajo asignado.

## Fuera de alcance

- **El comportamiento de tocar una ficha** (toggle: la misma deselecciona, otra cambia el foco)
  no cambia — ya es correcto desde la spec 010 y no se toca.
- **El modo pintar de un sistema de defensa.** Con un jugador seleccionado, pinchar el fondo
  sigue pintando o borrando una celda exactamente igual que hoy (specs 022/024); no se añade
  ninguna distinción de toque vs. arrastre al gesto de pintado. Deseleccionar mientras se pinta
  se hace tocando de nuevo a la ficha seleccionada, como ya permite el toggle existente.
- **Pinchar el fondo en defensa sin nadie seleccionado** no cambia: sigue sin hacer nada.

**Esta spec toca `application/` y `ui/`, no solo `domain/`** — no hay ninguna regla de voleibol
implicada, es estado e interacción de pantalla. Autorizado explícitamente, igual que specs
anteriores.

## Decisión ya tomada con el usuario (no reabrir)

En un sistema de defensa con alguien seleccionado, pinchar el fondo sigue pintando/borrando una
celda tal cual hoy; la deselección por fondo solo actúa donde el fondo no tiene ya otro trabajo
(recepción, o defensa sin nadie seleccionado).

## Escenarios

**E1 — Arrastrar una ficha ya en la pista y soltarla dentro del campo la deja seleccionada**
- Dado: una formación con dos jugadores colocados, uno de ellos ya seleccionado
- Cuando: se arrastra al otro (el no seleccionado) a un punto dentro del campo y se suelta
- Entonces: el jugador arrastrado queda seleccionado, y el que lo estaba antes deja de estarlo

**E2 — Arrastrar una ficha nueva desde el banquillo y soltarla dentro del campo la deja
seleccionada**
- Dado: un jugador todavía sin colocar
- Cuando: se arrastra desde el banquillo a un punto dentro del campo y se suelta
- Entonces: queda colocado y seleccionado

**E3 — Arrastrar una ficha fuera del campo la quita; si estaba seleccionada, se deselecciona**
- Dado: un jugador colocado y seleccionado
- Cuando: se arrastra fuera del campo y se suelta
- Entonces: deja de estar en la formación y deja de estar seleccionado

**E4 — En un sistema de recepción, pinchar el fondo con un jugador seleccionado lo deselecciona**
- Dado: un sistema de recepción con un jugador seleccionado
- Cuando: se pincha en el fondo de la pista
- Entonces: deja de haber ningún jugador seleccionado

## Preguntas abiertas

Ninguna. Resuelta con el usuario antes de congelar — ver «Decisión ya tomada» más arriba.

## Al cerrar

Los 4 escenarios se cumplen. Partida: 223 tests (tras cerrar la spec 026); al cerrar, 227 — 4
nuevos en `application/sistema.store.spec.ts`. E2 (arrastrar desde el banquillo) no tiene test
propio: usa el mismo `enfocarJugador` que ya prueba E1, desde el otro punto de la función
`iniciarArrastre` donde `origen === 'paleta'`; solo la cablería en `Tablero` cambia, verificada
con `npm run build` y revisión de código, no con test — mismo criterio que el resto de la
interacción de arrastre, que tampoco tiene test unitario en este proyecto.

**Se añadió un escenario no pedido explícitamente en la spec, `E3b`** (quitar a un jugador que
no es el seleccionado no toca la selección actual): surge directamente de la condición `if
(this.jugadorSeleccionadoId() === jugadorId)` que hace falta escribir para E3, y sin el test se
quedaría sin verificar el otro lado de esa condición. Mismo patrón que ya usaron specs
anteriores (008-E4b/E4c) para nombrar un test adicional sin renumerar toda la spec.

**Resolución del choque con el modo pintar (decidida antes de congelar):** no hizo falta ningún
cambio en la rama de defensa de `iniciarPintado` — solo se añadió el `return` de recepción antes
de su `if (!this.esDefensa())`. Las specs 022/024 quedan intactas.

**Lo que no se desvió:** `docs/dominio.md` no se tocó — es interacción de pantalla, no una regla
de voleibol. No se ha hecho la pasada visual en navegador; queda para cuando el usuario la
revise directamente, como con las specs 025 y 026.
