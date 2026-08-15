# 0019 — Se revierte la ADR 0018: `Rn` sí es "el colocador ocupa Pn"

**Estado:** Aceptada

**Contexto.** La ADR 0018 cambió `Rn` de "el colocador ocupa Pn" (ADR 0010) a "la rotación física
número n", apoyándose en seis ejemplos de rotación del usuario y en
`docs/voley/normas_posicion_recepcion_5_1.md`, ya en el repo, que coincidía con ellos. Un segundo
envío de ejemplos, más cuidadoso, reveló que las seis formaciones físicas eran las mismas que las
del primer envío, pero con las etiquetas `R2`/`R6` y `R3`/`R5` intercambiadas — es decir, el
primer envío llevaba la numeración invertida, y el fichero de referencia, que coincidía con él,
llevaba el mismo error de forma independiente (o fue su origen). Confirmado explícitamente con el
usuario, y verificado además contra su primera petición de la sesión sobre a quién sustituye el
líbero en cada rotación (consistente solo con esta numeración, no con la de la 018).

**Decisión.** `formacionEnRotacion`/`rotacionDe` vuelven a la fórmula de la ADR 0010: `Rn`
significa "el colocador ocupa la posición rotacional Pn". `docs/voley/normas_posicion_recepcion_5_1.md`
se corrige: sus secciones "Rotación 2" y "Rotación 6" se intercambian de contenido (igual con
"Rotación 3" y "Rotación 5"), y su checklist del §3 pasa de listar "R1, R2, R3" como las
rotaciones con colocador zaguero a listar "R1, R5, R6", que es el conjunto correcto bajo esta
numeración.

**Consecuencias.** Revierte exactamente lo que tocó la ADR 0018: `003-E3`
(`rotacion.spec.ts`) y `003-E8` (`validacion.spec.ts`) vuelven a sus aserciones originales. La
tabla de referencia de seis rotaciones (`plantilla-global.spec.ts`) se mantiene como test — es
útil independientemente de qué convención esté vigente — pero con los valores corregidos. El
reordenamiento de las pestañas de rotación en `ui/tablero/tablero.ts` (`[1,6,5,4,3,2]`, hecho
bajo la ADR 0018 para que las pestañas siguieran el orden en que el colocador recorre P1..P6) se
revierte a `[1,2,3,4,5,6]`: con esta convención, ese orden numérico simple ya es el recorrido de
P1 a P6.

La spec 018 (índice de rol declarado) no se ve afectada: R1 es idéntica en ambos envíos de
ejemplos, y las etiquetas C1/C2/R1/R2 de `plantilla-global.ts` solo dependen de R1.

**Lección.** Dos sesiones seguidas corrigiendo la misma pieza, en direcciones opuestas, con una
fuente de referencia que resultó estar mal ambas veces de la misma manera. La corroboración de un
documento de referencia no sustituye la verificación directa con quien conoce el caso real: el
documento y el primer envío de ejemplos compartían el mismo error, así que se reforzaban
mutuamente en vez de contrastarse.
