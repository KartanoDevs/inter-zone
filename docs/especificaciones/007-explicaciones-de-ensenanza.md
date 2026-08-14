# 007 — Explicaciones de enseñanza por rotación y por jugador

**Estado:** Completada
**Paso de la hoja de ruta:** 3

## Problema

Hoy el sistema dice dónde se coloca cada jugador, pero no por qué. Un entrenador que arma una
formación tiene una razón para cada decisión —el central se esconde tras el colocador para no
delatar el ataque rápido, el líbero cubre el centro de la zaga—, y esa razón es precisamente lo
que se pierde cuando solo queda dibujado el punto en el campo.

## Objetivo

Cada rotación guardada puede llevar una explicación de conjunto, y cada jugador dentro de esa
rotación puede llevar la suya propia. Ambas son opcionales.

## Fuera de alcance

- El editor de texto en pantalla y el botón de editar. Eso es la spec 010.
- Guardar y recuperar las explicaciones entre sesiones del navegador. Eso es la spec 008.
- Cambiar quién ocupa la sexta plaza del orden de saque y qué pasa con las explicaciones del
  saliente: ya lo resuelve la spec 006 (E12), porque esa operación retira al jugador de la
  formación entera, explicación incluida.

## Escenarios

**E1 — Un sistema recién creado no tiene ninguna explicación**
- Dado: un sistema recién creado, sin ninguna rotación guardada
- Cuando: se consulta la explicación de cualquier rotación o de cualquier jugador
- Entonces: está vacía

**E2 — Guardar la explicación de una rotación**
- Dado: un sistema con una formación ya guardada en una rotación
- Cuando: se guarda un texto como explicación de esa rotación
- Entonces: queda asociado a ella

**E3 — Guardar la explicación de un jugador**
- Dado: un jugador colocado en una rotación guardada
- Cuando: se guarda un texto como explicación de ese jugador en esa rotación
- Entonces: queda asociado a él, sin afectar a la explicación de la rotación ni a la de otros
  jugadores

**E4 — Explicar a un jugador que no está en esa rotación**
- Dado: una rotación guardada y un jugador que no forma parte de esa formación
- Cuando: se intenta guardarle una explicación en esa rotación
- Entonces: se rechaza

**E5 — Volver a guardar la formación conserva las explicaciones de quien sigue colocado**
- Dado: una rotación guardada con explicación de rotación y de algún jugador
- Cuando: se guarda de nuevo esa rotación con una formación donde ese jugador sigue colocado,
  aunque cambie de sitio
- Entonces: su explicación y la de la rotación se mantienen

**E6 — Un texto en blanco borra la explicación existente**
- Dado: una rotación o un jugador con una explicación ya guardada
- Cuando: se guarda un texto vacío o formado solo por espacios
- Entonces: queda sin explicación, como si nunca se hubiera escrito una

**E7 — Borrar una rotación borra sus explicaciones**
- Dado: una rotación guardada con explicación de rotación y de algún jugador
- Cuando: se borra esa rotación
- Entonces: ninguna de las dos explicaciones sobrevive

**E8 — Las explicaciones de una rotación no contaminan a otra**
- Dado: un mismo jugador colocado en dos rotaciones distintas, cada una con su propia
  explicación para él
- Cuando: se consulta su explicación en una de las dos
- Entonces: es la suya en esa rotación, no la de la otra

## Preguntas abiertas

Ninguna. Se puede congelar en cuanto la revises.

## Al cerrar

Los 8 escenarios pasan (76 en total en `src/app/domain`). No existe `npm run test:coverage`
en `package.json`; no se reporta cobertura numérica por el mismo motivo que en specs
anteriores.

**Dónde vive el código.** `explicarRotacion` y `explicarJugador` se añadieron a
`sistema-recepcion.ts`, junto a las funciones que ya gobernaban un sistema (`guardarFormacion`,
`sistemaCompleto`, `borrarRotacion`), tal como preveía la spec. No hizo falta ningún fichero
nuevo.

**El punto delicado era E5.** `guardarFormacion` recibe formaciones "frescas" (como las que
produce el arrastre en pantalla, sin ningún `explicacion` puesto) y tenía que reconectar, por
`id` de jugador, la explicación que ese jugador tuviera en la formación anterior de la misma
rotación. Una primera versión del test que reconstruía la segunda formación con spread
(`{ ...c, punto: ... }`) habría hecho pasar el escenario sin ejercitar nada, porque el spread ya
arrastra el campo `explicacion` consigo — no habría demostrado que `guardarFormacion` conserva
nada. El test final construye la formación entrante sin ese campo a propósito
(`{ jugador: c.jugador, punto: {...} }`), para forzar de verdad el camino que busca la
explicación anterior.

**Lo que sorprendió:** E6 (texto en blanco borra) y E8 (una rotación no contamina a otra)
pasaron en verde sin tocar código: el primero porque `explicarRotacion`/`explicarJugador` ya
trataban el texto en blanco como borrado desde su primera versión (E2/E3 lo pedían para
cualquier texto, en blanco incluido, así que no hacía falta lógica aparte); el segundo porque
el aislamiento entre rotaciones es una propiedad del propio `Record` indexado por número de
rotación, no algo que haya que programar.

**Lo que no se desvió:** ninguna regla de `docs/dominio.md` resultó incorrecta. Que el
interruptor central2/líbero se guarde por sistema y no por rotación (decidido junto al usuario
antes de escribir código) no es una regla de voleibol, así que no le corresponde vivir en
`docs/dominio.md`.
