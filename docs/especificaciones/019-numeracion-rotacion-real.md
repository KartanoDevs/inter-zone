# 019 — `Rn` es la rotación física número n, no "el colocador en Pn"

**Estado:** Completada
**Paso de la hoja de ruta:** 3 (corrección de la ADR 0010, descubierta al cerrar la spec 018)

## Problema

`Rn` significa hoy "el colocador ocupa Pn" (ADR 0010). Al verificar la pizarra contra seis
rotaciones reales de un 5-1, esa definición falla en cuatro de las seis: la rotación
físicamente siguiente a R1 (moviendo a cada jugador un paso en el sentido
`P2→P1→P6→P5→P4→P3→P2`, que ya está bien documentado y no cambia) coloca al colocador en **P6**,
no en P2 — y esa rotación es la que el entrenador llama **R2**. Solo R1 y R4 coinciden con
"colocador en Pn" por coincidencia aritmética; R2, R3, R5 y R6 no.

El propio material de referencia que ya vive en el repo, `docs/voley/normas_posicion_recepcion_5_1.md`,
lo confirma: en su "Rotación 2 (R2)" el colocador está en zona 6, no en zona 2; en su "Rotación 5
(R5)" dice explícitamente "el Colocador está en su posición natural de armado en el centro de la
red" — que es zona 3, no zona 5. `docs/dominio.md` §4 afirma justo lo contrario ("R3 es su
posición natural de armado en la red"), citando el mismo hecho con el número de rotación
equivocado.

## Objetivo

`Rn` es la rotación físicamente número `n`: R1 es la formación de partida (colocador en P1), y
cada `Rn+1` es exactamente un paso de rotación real después de `Rn`, en el sentido ya documentado
`P2→P1→P6→P5→P4→P3→P2`. El colocador recorre, en orden, P1, P6, P5, P4, P3, P2 para R1..R6.

## Fuera de alcance

- El índice de rol (spec 018): no se toca, ya está corregido y no depende de esto.
- El defecto del sustituto del líbero por rotación (spec 017): la *regla* ("el central que cae
  en zaga en esa rotación") no cambia; los valores concretos que produce para cada `Rn` sí
  pueden cambiar, porque ahora cada `Rn` apunta a una formación física distinta. Es una
  consecuencia mecánica de este arreglo, no una decisión nueva.
- Nada de `ui/`: `Tablero` solo pinta `"R" + rotacionActiva()` y delega todo el cálculo en
  `SistemaStore` → dominio; no tiene ninguna suposición propia sobre qué formación es cada `Rn`.
- **Esta spec sí autoriza tocar `application/` en la medida en que sus tests dependan de valores
  concretos de `rotacionActiva`** — no se espera que haga falta, porque `SistemaStore` nunca
  calcula formaciones por número de rotación a mano, todo pasa por `jugadoresEnPista`.

## Escenarios

**E1 — La rotación física siguiente a R1 es R2, y el colocador queda en P6, no en P2**
- Dado: un orden de saque con el colocador en P1 (R1)
- Cuando: se pide R2
- Entonces: el colocador ocupa P6

**E2 — El colocador recorre P1, P6, P5, P4, P3, P2 para R1..R6, en ese orden**
- Dado: un orden de saque cualquiera
- Cuando: se piden las seis rotaciones en orden
- Entonces: la posición del colocador en cada una es, respectivamente, P1, P6, P5, P4, P3, P2 —
  no la secuencia P1, P2, P3, P4, P5, P6 que asumía la ADR 0010

**E3 — `rotacionDe` es la inversa exacta de `formacionEnRotacion`**
- Dado: una formación ya colocada P1..P6, construida para una rotación `n` conocida
- Cuando: se pregunta a qué rotación pertenece
- Entonces: devuelve ese mismo `n`, para las seis

**E4 — Las seis rotaciones del 5-1 de referencia colocan a cada jugador donde toca**
- Dado: la plantilla global (líbero sustituyendo al central de zaga en cada rotación, spec 017)
- Cuando: se recorren las seis rotaciones
- Entonces: la etiqueta de quien ocupa cada Pn coincide, rotación a rotación, con:

  | | z1 | z2 | z3 | z4 | z5 | z6 |
  |---|---|---|---|---|---|---|
  | R1 | C | R1 | C2 | O | R2 | L |
  | R2 | R1 | C2 | O | R2 | L | C |
  | R3 | L | O | R2 | C1 | C | R1 |
  | R4 | O | R2 | C1 | C | R1 | L |
  | R5 | R2 | C1 | C | R1 | L | O |
  | R6 | L | C | R1 | C2 | O | R2 |

## Preguntas abiertas

Ninguna. Resuelto con el usuario y corroborado con `docs/voley/normas_posicion_recepcion_5_1.md`,
que ya estaba en el repo y describe exactamente esta misma secuencia sin que nadie la hubiera
contrastado contra la ADR 0010 al escribirla.

## Al cerrar

Los 4 escenarios pasan (147 tests en total en `domain/`, `application/` e `infrastructure/`;
138 antes de esta spec, más 3 tests nuevos en `rotacion.spec.ts` (E1-E3) y 6 en
`plantilla-global.spec.ts` (E4, uno por rotación)).

**El alcance real coincidió con lo previsto**, incluida la corroboración inesperada: al buscar
si el proyecto ya tenía material de referencia sobre rotaciones, apareció
`docs/voley/normas_posicion_recepcion_5_1.md` (ya en el repo desde antes de esta sesión) con la
secuencia completa de las seis rotaciones, coincidiendo exactamente con los ejemplos del
usuario y contradiciendo la ADR 0010 sin ambigüedad. No hizo falta inventar ni verificar la
regla desde cero: ya estaba escrita y nadie la había contrastado contra el código.

**Tests mecánicos en specs ya `Completada`.** 003-E3 y 003-E8 (`rotacion.spec.ts`,
`validacion.spec.ts`) cambiaron el valor esperado de una posición o rotación concreta, sin
cambiar qué demuestran. 005-E4 (`sistema-recepcion.spec.ts`) se reescribió apoyándose en
`formacionLegalPara` en vez de en jugadores y puntos hardcodeados — más robusto, porque ya no
depende de la numeración de rotación para seguir teniendo sentido. Mismo patrón que dejaron
documentado las ADR 0014 y 0015 con cascadas anteriores.

**`docs/dominio.md` se corrigió en dos sitios, no uno**: la entrada "Rotación" del vocabulario
(§1) y la sección "Numeración de las rotaciones" (§4), que además llevaba un error de cita
concreto ("R3 es su posición natural de armado en la red") que ni siquiera era correcto bajo su
propia ADR 0010 — el documento de referencia que lo hubiera desmentido llevaba en el repo desde
antes.

**Lo que no se desvió:** los 4 escenarios se implementaron tal como se habían planificado. La
fórmula de `formacionEnRotacion`/`rotacionDe` fue exactamente la derivada a mano antes de
escribir la spec, sin ajustes durante la implementación.
