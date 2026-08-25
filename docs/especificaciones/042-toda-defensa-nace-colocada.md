# 042 — Toda defensa nace colocada, y el colocador rival siempre arma en el mismo sitio

**Estado:** Completada
**Paso de la hoja de ruta:** 7 (sistemas de defensa)

## Problema

Una variante de defensa que aún no se ha guardado (sistema nuevo, o una combinación de caso,
situación y bloqueadores nunca tocada) nace sin ningún puesto colocado. Si el entrenador saca un
puesto de la pista mientras la retoca, no hay ningún banquillo del que volver a arrastrarlo: el
puesto desaparece para siempre de esa variante. Además, hoy el colocador rival se dibuja en un
punto distinto según su caso: pegado a la red cuando es delantero, en su zona 1 de zaga cuando es
trasero. Pero un colocador zaguero no arma desde el fondo — penetra hasta la red para hacerlo, al
mismo sitio, entre las zonas 2 y 3, donde ya se dibuja al delantero. Mostrarlo en el fondo enseña
algo que no pasa en pista.

## Objetivo

Cualquier variante de defensa, guardada o no, arranca con los seis puestos ya colocados según la
defensa de referencia de su situación (o una postura base si esa situación no tiene material). Un
puesto sacado de la pista aparece en un banquillo y se puede volver a arrastrar. El colocador
rival se dibuja siempre en el mismo punto, sea cual sea su caso.

## Fuera de alcance

- Cualquier cambio en el propio cálculo de la defensa de referencia (`PUNTOS`, `CELDAS`,
  `EXPLICACIONES` de `z2`/`z3`/`z4`/`pipe`): ya existen y se reutilizan tal cual.
- Cambiar qué situaciones existen para cada caso (`SITUACIONES_POR_CASO`, spec 038): con el
  colocador rival trasero sigue sin existir el ataque por 1, y con delantero sigue sin existir el
  ataque por 2. Solo cambia dónde se **dibuja** al colocador, no qué opciones puede atacar su
  equipo.
- Marcar visualmente delantero/trasero en las fichas de los puestos propios: descartado en esta
  ronda de mejoras, no forma parte de esta spec.
- Tocar `application/` más allá de qué formación por defecto entrega `formacionGuardadaActiva`
  cuando no hay variante guardada. El guardado, el pintado de celdas y el resto del ciclo de
  edición no cambian.

## Escenarios

### Postura por defecto

**E1 — Una situación con material de referencia nace con esa defensa**
- Dado: una variante de `z2`, `z3`, `z4` o `pipe` que nunca se ha guardado
- Cuando: se entra a esa combinación de caso y situación
- Entonces: los seis puestos aparecen colocados exactamente donde los coloca la defensa de
  referencia que ya usa el sistema sembrado para esa situación

**E2 — La postura inicial y el ataque por 1 nacen con una postura base**
- Dado: la situación `inicial`, o `z1` (ataque por 1, solo existe con el colocador rival
  delantero)
- Cuando: se entra a esa variante sin haberla guardado nunca
- Entonces: los seis puestos aparecen colocados, tres en la línea de la red y tres repartidos en
  zaga, en vez de los seis amontonados en el origen como pasaba antes

**E3 — Una variante ya guardada muestra lo guardado, no el defecto**
- Dado: una variante de defensa que el entrenador ya retocó y guardó
- Cuando: se vuelve a entrar a ella
- Entonces: se ven las posiciones guardadas, no las de la defensa de referencia ni la postura base

**E4 — La postura por defecto no se guarda si nadie la toca**
- Dado: una variante nunca guardada, mostrando su postura por defecto
- Cuando: se navega a otra variante sin haber movido, quitado ni pintado nada
- Entonces: al volver, sigue sin existir como variante guardada — sigue mostrando el mismo
  defecto, no una copia guardada de él

### Banquillo en defensa

**E5 — Sacar un puesto de la pista lo manda a un banquillo**
- Dado: una variante de defensa con los seis puestos colocados
- Cuando: se arrastra uno de ellos fuera de la pista
- Entonces: deja de verse en la pista y aparece disponible para volver a colocarlo, igual que un
  jugador sin colocar en un sistema de recepción

**E6 — Desde el banquillo se puede volver a colocar un puesto**
- Dado: un puesto en el banquillo de una variante de defensa
- Cuando: se arrastra desde ahí hasta un punto de la pista
- Entonces: el puesto aparece colocado en ese punto, con la etiqueta que le corresponde por línea
  (spec 038, E12)

### El colocador rival

**E7 — El colocador rival se dibuja en el mismo punto sea cual sea su caso**
- Dado: una variante de defensa
- Cuando: se cambia el caso del colocador rival de delantero a trasero, o al revés
- Entonces: la ficha "C" del colocador rival no se mueve — sigue en el mismo punto, entre las
  zonas 2 y 3 de su red

## Preguntas abiertas

Ninguna que bloquee congelar la spec. El usuario ya validó el criterio general (E2: cada
situación con material nace con su defensa de referencia; `inicial`/`z1` nacen con una postura
base en vez de con los seis en el origen). Las coordenadas exactas de esa postura base **no** son
una regla de voleibol — es la misma naturaleza de decisión libre que ya tienen los puntos de
`z2`/`z3`/`z4`/`pipe` (`docs/dominio.md` no fija ninguna coordenada, solo la disposición
P1..P6 y qué zona cubre cada puesto): tres en la red, tres repartidos en zaga, dentro del campo
de 9×9. Propuesta usada al implementar, ajustable sin volver a abrir la spec si al verla en
pantalla no convence: `4→(2.0, 0.5)`, `3→(4.5, 0.5)`, `2→(7.0, 0.5)`, `5→(1.5, 6.5)`,
`6→(4.5, 7.5)`, `1→(7.5, 6.5)`.

## Al cerrar

Los 7 escenarios pasan. Suite: 297 tests al arrancar esta spec (cierre de la 043) → 303 al
cerrarla — 2 nuevos en `domain/sistema-defensa-por-defecto.spec.ts` (E1, E2), 4 nuevos en
`application/sistema.store.spec.ts` (E1-E4, con E3 reforzando lo que ya cubría 038-E5). E5-E7
(banquillo y colocador rival) son interacción y render puros, sin `tablero.spec.ts` ni
`pista.spec.ts` en el proyecto: verificados con `npm run typecheck` + `npm run build`
(compilación estricta de plantillas) y revisión de código, mismo criterio que dejó escrito la
spec 024 en su cierre. `npm run typecheck` y `npm run build` limpios; el único aviso del build
(`tablero.css` sobre presupuesto) es preexistente, no lo introdujo esta spec.

**Desviación real, no anticipada: `formacionDefensaPorDefecto` estuvo a punto de romper el
invariante de la spec 024.** El primer intento reutilizó `formacionDe(situacion)` sin más —
la misma función que sirve al sistema sembrado —, así que la postura por defecto traía también
`celdas` y `explicacion` de la defensa de referencia. Como `colocarOMover` conserva el resto de
la colocación al reposicionar (`{ ...previa, puesto, punto }`), en cuanto el entrenador movía un
puesto por primera vez arrastraba consigo una zona de responsabilidad que nunca había pintado —
justo lo que la spec 024 (E3-E8) distingue como "nunca tocado" (`undefined`) frente a "guardado
explícito". Lo delató la propia suite: los tests de "zona por defecto (spec 024)" pasaron a fallar
en cuanto la variante por defecto dejó de estar vacía. Corregido antes de tocar `ui/`:
`formacionDefensaPorDefecto` solo aporta `punto`; `celdas` y `explicacion` quedan sin definir
hasta que el entrenador pinta o escribe algo, en cualquier variante, tocada o no.

**Cuatro tests existentes, de las specs 038 y 039, codificaban el defecto antiguo ("nace vacía")
como parte de su aserción, no como su objetivo real.** `038-E13`, `038-E15`,
`038 (confirmar cambio)` y `039-E3` esperaban un borrador vacío al entrar a una variante nunca
guardada. Se reescribieron para comprobar lo que de verdad querían probar —que colocar/mover/
quitar funciona igual que en recepción, que se puede guardar, que cambiar de caso o de
bloqueadores descarta lo no guardado— sobre la base de que ahora siempre hay seis puestos de
partida. La spec 039-E3 se corrigió in situ con una nota que apunta aquí, igual que ya hizo la
017-E8 al cerrar la spec 043: el punto que seguía siendo cierto (la variante de 1 bloqueador no
copia la de 2) se conservó; el que dejó de serlo ("vacío") se anotó como corregido, no se borró.

**No fue necesario ningún ADR nuevo.** A diferencia de la spec 043 (que corregía un invariante
de dominio), aquí no hay ninguna decisión estructural que no estuviera ya prevista en el objetivo
de esta spec: reutilizar `formacionDe`/`PUNTOS` para el defecto, y un id sintético `p${puesto}`
para el banquillo son la continuación directa de decisiones ya tomadas en el ADR 0029.

**`docs/dominio.md` §3 se actualizó** con la explicación de por qué el colocador rival se dibuja
siempre en el mismo punto (E7): no es un capricho visual, un colocador zaguero penetra a la red
para armar. No hubo que tocar `SITUACIONES_POR_CASO` ni ninguna otra regla de qué puede atacar
cada caso — solo dónde se pinta la ficha.

**Lo que no se desvió:** las coordenadas de la postura base (E2) propuestas al congelar la spec se
usaron tal cual, sin ajustes; a falta de una pasada visual en el navegador, no hubo motivo para
cambiarlas durante la implementación.
