# 020 — Se revierte la spec 019: `Rn` es "el colocador ocupa Pn"

**Estado:** Completada
**Paso de la hoja de ruta:** 3 (revierte la spec 019, que corrigió la ADR 0010 con datos que
resultaron llevar la numeración invertida)

## Problema

La spec 019 cambió `Rn` de "el colocador ocupa Pn" (ADR 0010) a "la rotación física número n",
apoyándose en seis ejemplos del usuario y en `docs/voley/normas_posicion_recepcion_5_1.md`, ya en
el repo. Un segundo envío de ejemplos, más cuidadoso, reveló que las seis formaciones físicas eran
las mismas que las del primer envío pero con `R2` y `R6` intercambiadas, y `R3` y `R5`
intercambiadas — es decir, el primer envío llevaba la numeración invertida, y con él el fichero de
referencia que coincidía. Confirmado explícitamente con el usuario: `Rn` = "el colocador ocupa
Pn" es la convención correcta.

## Objetivo

`formacionEnRotacion`/`rotacionDe` vuelven a la fórmula de la ADR 0010: `Rn` significa "el
colocador ocupa la posición rotacional Pn". `docs/voley/normas_posicion_recepcion_5_1.md` deja de
contradecir esta convención.

## Fuera de alcance

- El índice de rol (spec 018): no se toca. `R1` es idéntica en los dos envíos de ejemplos, y las
  etiquetas C1/C2/R1/R2 de `plantilla-global.ts` solo dependen de R1.
- El defecto del sustituto del líbero por rotación (spec 017): la regla no cambia; sus valores
  concretos por `Rn` vuelven a los de antes de la spec 019, automáticamente, sin tocar su código.

## Escenarios

**E1 — Pedir R3 coloca al colocador en P3**
- Dado: un orden de saque con el colocador en una posición cualquiera
- Cuando: se pide R3
- Entonces: el colocador ocupa P3 (no P5, que era el comportamiento de la spec 019)

**E2 — Las seis rotaciones del 5-1 de referencia colocan a cada jugador donde toca**
- Dado: la plantilla global (líbero sustituyendo al central de zaga en cada rotación, spec 017)
- Cuando: se recorren las seis rotaciones
- Entonces: la etiqueta de quien ocupa cada Pn coincide, rotación a rotación, con:

  | | z1 | z2 | z3 | z4 | z5 | z6 |
  |---|---|---|---|---|---|---|
  | R1 | C | R1 | C2 | O | R2 | L |
  | R2 | L | C | R1 | C2 | O | R2 |
  | R3 | R2 | C1 | C | R1 | L | O |
  | R4 | O | R2 | C1 | C | R1 | L |
  | R5 | L | O | R2 | C1 | C | R1 |
  | R6 | R1 | C2 | O | R2 | L | C |

## Preguntas abiertas

Ninguna. Confirmado explícitamente con el usuario, y verificado además contra su primera
petición de esta sesión ("en R6, R1 y R2 el central cercano C1 está en zaga, se sustituye por
el líbero; en R3, R4 y R5 es C2"): con esta convención, el central en zaga es C1 en R1/R2/R6 y
C2 en R3/R4/R5 — consistente con todo lo dicho hasta ahora, no solo con la tabla de arriba.

## Al cerrar

Los 2 escenarios pasan (146 tests en total en `domain/`, `application/` e `infrastructure/`;
148 antes de esta spec, menos los tres tests de la 019 que probaban la convención revertida
—019-E1 y E2 se retiraron, E3 se conservó renombrado a 020-E1 porque el round-trip
`rotacionDe(formacionEnRotacion(...))` sigue siendo una propiedad válida— más 6 en
`plantilla-global.spec.ts`, ya contados en los 148 previos y solo actualizados de valor).

**El alcance real incluyó algo que el plan no anticipaba del todo: corregir
`docs/voley/normas_posicion_recepcion_5_1.md`.** No bastaba con revertir el código y la
documentación propia del proyecto — el fichero de referencia que corroboró (por error) la spec
019 seguía diciendo lo mismo que antes, y habría vuelto a inducir al mismo error la próxima vez
que alguien lo consultara para una duda de rotación. Se corrigió intercambiando el contenido de
sus secciones "Rotación 2"/"Rotación 6" y "Rotación 3"/"Rotación 5", y su checklist del §3, que
agrupaba "R1, R2, R3" como las rotaciones con colocador zaguero — agrupación que solo tenía
sentido bajo la numeración equivocada; el grupo correcto es "R1, R5, R6".

**Lección, ya anotada en la ADR 0019:** un documento de referencia que coincide con un ejemplo no
lo corrobora de forma independiente si ambos comparten el mismo origen del error. Dos fuentes
alineadas se sintieron como confirmación cruzada la sesión pasada; en realidad eran una sola
fuente de error, repetida.

**Lo que no se desvió:** revertir fue mecánico una vez identificado qué tocar — los mismos
ficheros que cambió la 018/019, en sentido contrario. La spec 018 (índice de rol declarado) se
confirmó intacta, tal como preveía el plan.
