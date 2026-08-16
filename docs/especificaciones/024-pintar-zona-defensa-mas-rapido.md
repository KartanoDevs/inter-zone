# 024 — Pintar la zona de defensa más rápido

**Estado:** Completada
**Paso de la hoja de ruta:** 7 (sistemas de defensa)

## Problema

Pintar la zona de un jugador celda a celda (spec 022) obliga a barrer toda su superficie a
mano, y con 6 rotaciones × 4 vías de ataque son 24 formaciones de defensa por sistema: mucho
trabajo repetitivo. Además, la vista de conjunto (spec 023) es un modo aparte que desactiva el
pintado — para juzgar si entre todos dejan un hueco hay que salir de editar, mirar, y volver a
entrar. Y en recepción, donde no hay vías de ataque que defender, la zona de responsabilidad no
aporta nada que el entrenador use hoy.

Ya se ha corregido, fuera de esta spec: mover una ficha dejaba sin zona pintada y sin
explicación de enseñanza guardada de golpe, aunque no se tocara ninguna celda ni se cambiara el
texto. Esta spec da por hecho que ese problema ya no existe.

## Objetivo

En un sistema de defensa, seleccionar un jugador arranca con un metro cuadrado ya marcado en su
posición, se puede ampliar cerrando un contorno además de celda a celda, y mientras tanto se ven,
atenuadas, las zonas ya pintadas de sus compañeros. La zona de responsabilidad deja de existir en
recepción.

**Esta spec toca `application/` y `ui/`, además de `domain/`.** El bloque por defecto, el cierre
de contorno y que las zonas de los compañeros se sigan viendo mientras se pinta son estado y
render de pantalla — no hay forma de construirlos sin tocar esas capas. Queda autorizado
explícitamente aquí, igual que las specs 021, 022 y 023.

## Fuera de alcance

- **Zonas por posición (P1..P6) en vez de por jugador.** Se valoró en el diseño de esta spec como
  forma de no repetir el pintado en las seis rotaciones, pero cambia qué significa una zona y
  cómo se relaciona con el color por jugador de la spec 023; queda para más adelante.
- **Copiar la zona de una formación a otra** (entre rotaciones, entre vías, o espejo z4↔z2).
- **Deshacer/rehacer trazos**, como ya dejó fuera la spec 022.
- **Cambiar `TAMANO_CELDA`.** Se queda en 0,5 m (ADR 0004); el bloque por defecto de esta spec
  cubre 4 celdas de 0,5 m, no una celda de 1 m.
- **Calcular huecos y conflictos automáticamente**: sigue siendo de las specs 014-015, sin
  escribir.
- **Borrar las celdas que ya hubiera guardadas en sistemas de recepción** de cuando la spec 022 sí
  lo permitía: se quedan en el dato guardado, solo dejan de mostrarse y de poder editarse.

## Escenarios

### Ámbito: solo defensa

**E1 — Seleccionar un jugador en un sistema de recepción no activa el modo pintar**
- Dado: un sistema de tipo recepción, con un jugador colocado
- Cuando: se selecciona
- Entonces: arrastrar sobre el campo sigue moviendo fichas, igual que si no se hubiera
  seleccionado a nadie para pintar; no aparece ninguna zona

**E2 — Las celdas guardadas antes en recepción no se pierden**
- Dado: un sistema de recepción con celdas pintadas de cuando la spec 022 lo permitía
- Cuando: se guarda de nuevo esa formación sin haber tocado ninguna celda
- Entonces: las celdas siguen guardadas tal cual, aunque ya no se puedan ver ni editar

### Zona por defecto

**E3 — Seleccionar un jugador sin zona pintada muestra un bloque de 1 m² junto a su ficha**
- Dado: un jugador colocado en una formación de defensa, sin ninguna celda pintada
- Cuando: se selecciona
- Entonces: se ve marcado, como su zona, el bloque de 2×2 celdas más cercano al punto donde está
  colocado

**E4 — Cerca del borde del campo, el bloque por defecto se recorta**
- Dado: un jugador colocado tan cerca de una línea del campo que el bloque 2×2 más cercano a su
  punto se saldría de las 9×9
- Cuando: se selecciona
- Entonces: se marca solo la parte del bloque que cae dentro del campo — puede quedar en 2×1 o
  1×1 según cuántos lados se salgan — sin desplazar el bloque entero hacia dentro para que quepan
  las 4 celdas

**E5 — El bloque por defecto sigue a la ficha mientras no se ha pintado ni borrado nada para ese jugador**
- Dado: un jugador seleccionado, con el bloque por defecto visible, sin haber pintado ni borrado
  ninguna celda suya todavía
- Cuando: se mueve la ficha a otra posición
- Entonces: el bloque marcado se recalcula sobre la nueva posición

**E6 — Pintar o borrar cualquier celda de ese jugador congela su zona**
- Dado: un jugador seleccionado, con el bloque por defecto visible
- Cuando: se pinta o se borra cualquier celda en modo pintar para él, aunque sea una del propio
  bloque por defecto
- Entonces: la zona deja de recalcularse al mover la ficha — pasa a comportarse como cualquier
  otra zona pintada a mano (spec 022)

**E7 — Borrar una celda del bloque por defecto la convierte en zona explícita con las celdas restantes**
- Dado: un jugador seleccionado, con el bloque por defecto visible (4 celdas, o menos si el borde
  lo recortó según E4) y ninguna celda pintada de verdad todavía
- Cuando: se borra una de esas celdas
- Entonces: quedan marcadas las celdas restantes del bloque, ahora como zona explícita — no las
  originales completas, y no ninguna

**E8 — El bloque por defecto no se guarda si nadie lo ha tocado**
- Dado: una formación de defensa completa donde ningún jugador ha pintado, borrado, ni tocado su
  bloque por defecto
- Cuando: se guarda
- Entonces: ningún jugador queda con celdas guardadas para esa formación

### Relleno por contorno

**E9 — Un trazo que se cierra rellena lo que encierra**
- Dado: un jugador seleccionado, en modo pintar
- Cuando: se arrastra dibujando un contorno que vuelve a pasar cerca de donde empezó
- Entonces: quedan marcadas tanto las celdas del contorno como las que quedan encerradas dentro

**E10 — Un trazo que no se cierra no rellena nada**
- Dado: un jugador seleccionado, en modo pintar
- Cuando: se arrastra sin volver cerca del punto de partida
- Entonces: solo quedan marcadas las celdas por las que ha pasado el trazo, como hasta ahora
  (spec 022, E4)

**E11 — El relleno nunca marca celdas fuera del campo propio**
- Dado: un jugador seleccionado, en modo pintar
- Cuando: se cierra un trazo que pasa por el borde del campo
- Entonces: ninguna celda fuera de las líneas del campo propio queda marcada, aunque el contorno
  la hubiera encerrado (spec 022, E7)

### Ver a los compañeros mientras se pinta

**E12 — Las zonas de los compañeros se ven atenuadas mientras se pinta la de uno**
- Dado: una formación de defensa donde varios jugadores tienen zona pintada
- Cuando: se selecciona uno de ellos para pintar
- Entonces: su zona se ve a plena intensidad; las zonas de los demás se ven también, pero
  atenuadas — no hace falta fijar aquí la opacidad exacta, solo que se distingan de la activa

**E13 — Sin nadie seleccionado se ven todas las zonas igual**
- Dado: una formación de defensa donde varios jugadores tienen zona pintada, sin nadie
  seleccionado
- Cuando: se mira el campo
- Entonces: se ven todas las zonas pintadas, ninguna destacada por encima de las demás

**E14 — El interruptor de vista de conjunto desaparece**
- Dado: cualquier formación de defensa
- Cuando: se pinta o se navega la pizarra
- Entonces: no existe ningún control aparte para "ver todas las zonas" (spec 023) — verlas es lo
  normal; seleccionar solo cambia a quién se pinta

## Preguntas abiertas

Ninguna. Resueltas con el usuario antes de congelar esta spec:

- **Bloque por defecto cerca del borde del campo (E4):** se recorta a las celdas que caben dentro
  de las 9×9, sin desplazar el bloque hacia dentro. Puede quedar en 2×1 o 1×1 según cuántos lados
  se salgan.
- **Umbral de "trazo cerrado" (E9):** se compara solo la celda donde empezó el trazo con la celda
  donde termina, al soltar. Si son la misma, o comparten lado o esquina, se considera cerrado.
  Habla en el mismo lenguaje que ya usa el resto del pintado (celdas, no píxeles ni metros) y
  resuelve el cruce del trazo consigo mismo sin necesidad de detectarlo: como solo mira principio
  y final, cruzarse por el medio en otro punto nunca cuenta como cierre.

## Al cerrar

Los 14 escenarios pasan. Partida: 177 tests (tras corregir aparte el bug de `colocarOMover`
descrito en el Problema); al cerrar, 196 — 12 nuevos en `domain/` (`rejilla.spec.ts`) y 7 en
`application/` (`sistema.store.spec.ts`). No existe `npm run test:coverage`, igual que en las
specs anteriores. E1 (bloquear el modo pintar en recepción), la conexión del relleno por
contorno en el gestor de arrastre, y E12-E14 (opacidad, quitar el interruptor de la spec 023)
son interacción y render puros — sin `tablero.spec.ts` ni `pista.spec.ts` en el proyecto,
verificados con `npm test` + `npm run build` (compilación estricta de plantillas) y revisión de
código, no con el navegador; queda pendiente una pasada visual si se quiere antes de dar la spec
por buena en la práctica.

**Un fallo real, no anticipado, apareció al implementar E6-E7.** Seis tests ya existentes de la
spec 022 (`022-E4`, `E5`, `E6`, `E8`, `E10`, y el propio test de regresión del bug de
`colocarOMover`) colocaban al jugador en puntos "redondos" (`{x:1,y:1}`) y pintaban celdas
cercanas para simplificar sus aserciones. Al introducir el bloque por defecto (E6: "pintar o
borrar cualquiera de sus celdas congela la zona, partiendo de lo que ya se veía"), esas celdas
de prueba resultaron caer *dentro* del bloque por defecto de ese punto, así que `pintarCelda`
empezó a materializar las 4 celdas del defecto además de la pintada a mano, rompiendo aserciones
que esperaban solo 1-2 celdas. No era un error de la nueva función: la spec 022 nunca distinguió
"cero celdas porque nunca se tocó nada" de "cero celdas porque se vació a propósito" — antes de
esta spec ambas eran `undefined` y se comportaban igual. La 024 sí las distingue (`undefined`
muestra el defecto; `[]` no). Los seis tests se corrigieron sembrando `celdas: []` explícito en
la formación inicial en vez de colocar con `colocarOMover` (que siempre deja `celdas`
`undefined`), aislando así lo que de verdad querían probar — el mecanismo de pintar/borrar de la
022 — del mecanismo nuevo del bloque por defecto, que ya tiene sus propios tests (E3, E5-E8).

**Decisión de implementación no anticipada en la spec** (la spec describe el resultado, no el
algoritmo, per `docs/flujo-de-trabajo.md`): `bloquePorDefecto` no clampa el índice de celda base
hacia el interior del campo antes de elegir la dirección — solo comprueba si la celda vecina
"preferida" (según en qué mitad de su celda cae el punto) es válida. Si no lo es, se recorta en
vez de probar la dirección contraria. Es lo que hace que E3 (bloque más cercano) y E4 (se
recorta cerca del borde, sin desplazarse) sean compatibles con una sola función: una que sí
desplazara hacia el lado válido nunca necesitaría recortar, porque el campo (9 m) es múltiplo
exacto del bloque (1 m) — y eso habría vaciado E4 de contenido real.

**Decisión de arquitectura no anticipada:** `celdasJugadorSeleccionado` vivía como un `computed`
trivial dentro de `Tablero` (spec 022). Para que E1/E3/E5 fueran verificables sin `TestBed` se
movió a `SistemaStore`, donde ya dice el propio comentario de cabecera de `Tablero` que "vive
toda la lógica". `Tablero` pasó a leer `store.celdasJugadorSeleccionado()` directamente.

**Lo que sí se revirtió a propósito:** el interruptor de vista de conjunto de la spec 023
desaparece por completo (botón, signal `vistaConjunto`, input `celdasPintadas` de `Pista`), tal
y como pedía E14 — sustituido por mostrar siempre todas las zonas, con la del jugador
seleccionado a plena intensidad y las demás atenuadas vía el nuevo input `indiceColorSeleccionado`.

**`docs/dominio.md` §6 se corrigió**: las zonas de responsabilidad pasan de "cualquiera de los
seis, en recepción o defensa" a "solo en defensa", y se documenta el concepto de zona por
defecto. `docs/arquitectura.md` se actualizó con las funciones nuevas de `rejilla.ts`, los
cambios en `SistemaStore` y en `Pista`/`Tablero`.

**Lo que no se desvió:** los tres puntos resueltos con el usuario al congelar (bloque 2×2 más
cercano recortado en el borde, cierre de trazo por celda vecina, relleno por flood fill puro en
`rejilla.ts`) se implementaron tal cual, sin ajustes posteriores.
