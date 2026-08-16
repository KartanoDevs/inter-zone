# 029 — Sistema defensivo 2-1-3 por defecto

**Estado:** Descartada
**Paso de la hoja de ruta:** No encaja en ningún paso: siembra un segundo dato de ejemplo, como
la spec 025.

## Problema

Solo existe un sistema de ejemplo (recepción a 3, spec 025). Existe una guía táctica completa
del sistema defensivo 2-1-3 (2 bloqueadores, 1 off-blocker, 3 defensores profundos) para las 6
rotaciones del 5-1, contra ataque por zona 4 y zona 2
(`docs/voley/Guia_Sistema_Defensivo_2-1-3_Esquema_5-1.md`), que no tiene dónde vivir en la app.

## Objetivo

Al abrir la app sin nada guardado, además del sistema de recepción, aparece un sistema de
defensa «Defensa 2-1-3 (5-1)» con doce formaciones (las seis rotaciones, contra Z4 y contra Z2),
cada una con sus seis defensores colocados, su zona de responsabilidad pintada, descripción
general, explicación de conjunto por rotación-y-vía y explicación de cada jugador.

## Fuera de alcance

- **Z3 y pipe se quedan sin formación** (decidido con el usuario): la guía solo cubre Z4 y Z2.
  El modelo ya lo permite (`Sistema.defensas` es parcial); no se inventa táctica que la guía no
  documenta.
- **No se toca `plantilla-global.ts`.** Misma plantilla y mismo líbero por defecto que la
  recepción (spec 025) — la tabla de rotaciones de esta guía es idéntica a la de la de
  recepción, verificado fila a fila.
- **No se calculan huecos ni conflictos** (specs 014-015, sin escribir): pintar la zona de cada
  jugador no implica detectar si entre todos dejan un hueco.
- **Exportar/importar** sigue siendo la spec 016.

**Esta spec toca `application/` e `infrastructure/`, además de `domain/`** — sembrar un segundo
sistema por defecto es una decisión de qué se entrega al arrancar sin datos, igual que autorizó
la spec 025.

## Decisiones ya tomadas con el usuario (no reabrir)

1. Z3 y pipe se quedan sin formación en este sistema.
2. Al arrancar sin nada guardado, la app siembra **los dos** sistemas de ejemplo a la vez
   (recepción y defensa), no uno solo. Cada uno sigue siendo independiente: editable,
   renombrable, borrable por separado.

## Un hallazgo que simplifica el trabajo: el sistema es puramente posicional

Comprobado con la guía: quién bloquea, quién es off-blocker y quién defiende profundo depende
**solo** de la posición rotacional (P1..P6) y de la vía (Z4 o Z2) — nunca de qué jugador concreto
ocupa esa posición. En las seis rotaciones, el patrón es idéntico:

| | vs Z4 | vs Z2 |
|---|---|---|
| **P2** | Off-blocker | Bloqueador exterior |
| **P3** | Bloqueador central (se desplaza a la izquierda) | Bloqueador central (se desplaza a la derecha) |
| **P4** | Bloqueador exterior | Off-blocker |
| **P1, P5, P6** | Defensores profundos (siempre, en las dos vías) | Defensores profundos (siempre, en las dos vías) |

Consecuencia de diseño: los puntos, las zonas y las explicaciones por jugador se declaran **una
vez por (posición rotacional, vía)** — doce combinaciones — y se reutilizan en las seis
rotaciones, en vez de tener que diseñar seis geometrías distintas como hizo falta en la spec 025
para recepción. Coherente con que la guía llama a este sistema «de lectura»: «los bloqueadores y
defensores no tienen posiciones fijas preasignadas» por identidad, leen la jugada (§1.1).

Lo que sí varía rotación a rotación es la **explicación de conjunto** (ruta del colocador,
complejidad, plan de emergencia si el colocador bloquea o defiende) — eso sale de las notas de
la guía por rotación (§3.1-3.6) y se traduce con la misma tabla guía↔app que ya usó la spec 025
(guía R1→app R1, R2→R6, R3→R5, R4→R4, R5→R3, R6→R2 — la tabla de rotaciones de esta guía es
idéntica a la de recepción).

## Escenarios

### El sistema por defecto

**E1 — Con nada guardado, aparecen los dos sistemas de ejemplo a la vez**
- Dado: no hay ningún payload legible en `localStorage`
- Cuando: se abre la app
- Entonces: el catálogo trae el sistema de recepción (spec 025) y un sistema de defensa
  «Defensa 2-1-3 (5-1)»

**E2 — El sistema de defensa por defecto tiene doce formaciones**
- Dado: el sistema de defensa por defecto
- Cuando: se mira `sistema.defensas`
- Entonces: las seis rotaciones tienen formación guardada para `z4` y para `z2`; ninguna para
  `z3` ni `pipe`

**E3 — El líbero está en pista donde le corresponde, en las doce formaciones**
- Dado: el sistema de defensa por defecto
- Cuando: se mira cada una de las doce formaciones
- Entonces: el roster coincide con `jugadoresEnPista(PLANTILLA_GLOBAL, rotacion)` — el líbero en
  vez del central que le toque en zaga en esa rotación

**E4 — El patrón bloqueador/off-blocker/defensor es el descrito en la tabla posicional**
- Dado: el sistema de defensa por defecto
- Cuando: se mira, para cada vía, quién ocupa P2, P3 y P4
- Entonces: coincide con la tabla de la sección anterior (vs Z4: P3+P4 bloquean, P2 es
  off-blocker; vs Z2: P2+P3 bloquean, P4 es off-blocker), en las seis rotaciones

**E5 — Cada formación trae su explicación de conjunto**
- Dado: el sistema de defensa por defecto
- Cuando: se mira `explicacionesDefensaRotacion` (o donde corresponda) de una rotación y vía
- Entonces: no está vacía y resume la nota de esa rotación en la guía

**E6 — Cada jugador de cada formación trae su propia explicación**
- Dado: el sistema de defensa por defecto
- Cuando: se mira la explicación de un jugador colocado en una formación
- Entonces: no está vacía y describe su función táctica en esa posición y vía

**E7 — Es un sistema corriente: se puede editar y volver a guardar**
- Dado: el sistema de defensa por defecto con R1/Z4 seleccionada
- Cuando: se mueve una ficha y se guarda
- Entonces: la formación queda actualizada igual que en cualquier defensa creada a mano (sin
  validación de posición, como ya no la hay en ningún sistema de defensa)

### Descripción

**E8 — El sistema de defensa por defecto trae descripción general**
- Dado: el sistema de defensa por defecto
- Cuando: se lee su campo `descripcion`
- Entonces: no está vacío y resume qué es el sistema 2-1-3 y por qué se usa

### Zonas de responsabilidad

**E9 — Cada jugador de cada formación trae zona de responsabilidad pintada**
- Dado: el sistema de defensa por defecto
- Cuando: se mira `celdas` de cada jugador en cada una de las doce formaciones
- Entonces: no está vacío ni ausente

**E10 — Las zonas de los dos bloqueadores de una formación comparten al menos una celda**
- Dado: una formación del sistema de defensa por defecto
- Cuando: se comparan las celdas de los dos bloqueadores (P3 y el bloqueador exterior de esa
  vía)
- Entonces: tienen al menos una celda en común — refleja que el central se desplaza para cerrar
  el doble bloqueo y eliminar la costura (guía, §2.1)

### Siembra y persistencia

**E11 — Con sistemas ya guardados, no se siembra ninguno de los dos por defecto**
- Dado: `localStorage` con al menos un sistema legible en la versión actual
- Cuando: se abre la app
- Entonces: el catálogo es exactamente lo que había guardado

**E12 — Ida y vuelta por el repositorio conserva las doce formaciones, con sus zonas**
- Dado: el sistema de defensa por defecto
- Cuando: se guarda y se vuelve a leer con `LocalStorageSistemaRepository`
- Entonces: las doce formaciones, sus explicaciones y sus zonas llegan idénticas

## Preguntas abiertas

Ninguna. Resueltas con el usuario antes de congelar — ver «Decisiones ya tomadas» más arriba.

## Al cerrar

Los 12 escenarios se cumplen. Partida: 230 tests (tras cerrar la spec 028); al cerrar, 242 — 12
nuevos: 2 en `infrastructure/local-storage-sistema.repository.spec.ts` (E1, E11, E12 — E1 llevó
además el ajuste de seis tests ya existentes de las specs 008/025 que asumían un único sistema
sembrado, igual que documentó el cierre de la 025 al introducir la siembra) y 10 en
`domain/sistema-defensivo-por-defecto.spec.ts` (E2-E10).

**Nueve de los doce escenarios (todos salvo E1) llegaron en verde con la primera versión de la
factoría, sin ninguna vuelta atrás.** A diferencia de la spec 025, aquí no hizo falta iterar:
el hallazgo de que el sistema es puramente posicional (misma tabla P-slot/vía en las seis
rotaciones, ver la sección dedicada de esta spec) permitió diseñar la geometría completa antes
de escribir el primer test, así que "código mínimo para E1" ya era la implementación real, no
una versión provisional. El resto de escenarios confirmó el diseño en vez de forzarlo.

**Decisión de implementación no anticipada en la spec:** `Sistema.explicacionesRotacion` solo
tiene una entrada por rotación, no por rotación-y-vía — a diferencia de `Sistema.defensas`, que
sí distingue vía. La spec (E5) hablaba de "su explicación de conjunto (rotación y vía)" dando a
entender que hay un campo por vía; no lo hay, y añadirlo habría sido un cambio de modelo de
dominio fuera del alcance de sembrar un dato de ejemplo. Cada `explicacionesRotacion[n]` combina
las notas de Z4 y Z2 en un único texto ("Z4: ... · Z2: ..."), la única forma de que ambas
convivan con el modelo actual sin tocarlo.

**Esta spec dependía de la 028** (persistir `celdas`, cerrada primero en esta misma sesión): sin
ese arreglo, las zonas de responsabilidad del sistema por defecto se habrían visto al abrir la
app por primera vez pero desaparecido en cuanto se guardara cualquier cosa. E12 verifica el
conjunto ya con el arreglo puesto.

**Ningún cambio en `application/` ni en `ui/`**, a pesar de que la spec los autorizaba: el store
y `Tablero` ya trataban cualquier sistema de defensa de forma genérica desde la spec 021, así
que sembrar un segundo por defecto no necesitó ningún cableado nuevo — solo se comprobó con
`npm run build` que compila limpio.

**Lo que no se desvió:** la traducción de numeración guía↔app (idéntica a la de recepción,
verificada de nuevo aquí) y las dos decisiones tomadas con el usuario (Z3/pipe sin formación,
siembra de los dos sistemas a la vez) se implementaron tal cual. `docs/dominio.md` no se tocó.

## Descartada

El usuario pidió borrar el sistema de defensa por defecto: la geometría de puntos y zonas que
esta spec tuvo que inventar para traducir las descripciones cualitativas de la guía (dónde
exactamente se para cada defensor, qué celdas cubre cada uno) no refleja bien la táctica real.
Se rehará como una spec nueva, con instrucciones más precisas sobre la geometría concreta.

Revertido en un commit aparte: se borraron `domain/sistema-defensivo-por-defecto.ts` y su
`.spec.ts`, la siembra doble en `LocalStorageSistemaRepository.listar()` (vuelve a sembrar solo
la recepción, spec 025), y las menciones en `docs/arquitectura.md`/`README.md`. La spec 028
(persistir `celdas`) no se revierte: es un arreglo real e independiente, no específico de este
sistema. La guía (`docs/voley/Guia_Sistema_Defensivo_2-1-3_Esquema_5-1.md`) se conserva como
referencia para cuando se retome.
