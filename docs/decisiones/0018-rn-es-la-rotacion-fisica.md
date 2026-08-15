# 0018 — `Rn` es la rotación física número n, no "el colocador ocupa Pn"

**Estado:** Revertida por 0019 — se basaba en ejemplos de rotación que resultaron llevar la
numeración invertida por error del usuario. El contenido de la ADR 0010 es el vigente.

**Contexto.** Al cerrar la spec 018 se escribió un test que recorría las seis rotaciones de la
plantilla global y las comparaba con seis rotaciones reales de un 5-1 aportadas por el usuario.
R1 y R4 coincidían; R2, R3, R5 y R6 no — cada una salía con el contenido físico de otra rotación
de la misma tabla (`R2`↔`R6`, `R3`↔`R5`). La causa no era el índice de rol (ya corregido por la
ADR 0017): era la propia ADR 0010, que definió `Rn` como "el colocador ocupa Pn". Esa definición
solo coincide con la rotación físicamente siguiente cuando, por aritmética, `n` y la posición del
colocador avanzan en la misma dirección — lo cual ocurre para R1 y R4, pero no en general, porque
la rotación real gira en sentido `P2→P1→P6→P5→P4→P3→P2` (decreciente en el número de P, con
salto de P1 a P6), mientras que "colocador en Pn" para `n` creciente implicaría el sentido
contrario.

El propio material de referencia que ya vive en el repo,
`docs/voley/normas_posicion_recepcion_5_1.md`, lo confirma sin ambigüedad: su "Rotación 2 (R2)"
tiene al colocador en zona 6, no en zona 2; su "Rotación 5 (R5)" dice literalmente "el Colocador
está en su posición natural de armado en el centro de la red" (zona 3) — la misma frase que
`docs/dominio.md` atribuía a R3. Nadie había contrastado la ADR 0010 contra este documento al
escribirla.

**Decisión.** `Rn` es la rotación físicamente número `n`: R1 es la formación de partida
(colocador en P1), y cada `Rn+1` es exactamente un paso de rotación real después de `Rn`, en el
sentido `P2→P1→P6→P5→P4→P3→P2` ya documentado y sin cambios. El colocador recorre, en orden, P1,
P6, P5, P4, P3, P2 para R1..R6. `formacionEnRotacion` cambia su fórmula de desplazamiento de
`(indiceColocador - (rotacion-1) + 6) % 6` a `(indiceColocador + (rotacion-1)) % 6`; `rotacionDe`
(su inversa) pasa de `indiceColocador + 1` a `((6 - indiceColocador) % 6) + 1`. El anclaje al
colocador para definir R1 (la parte central de la ADR 0010) no cambia: sigue siendo necesario
para que R1 no dependa de en qué posición del orden de saque se escribió el colocador.

**Consecuencias.** Toca specs ya `Completada` que fijaban valores concretos de `Rn` distintos de
R1: 003-E3 y 003-E8 (`rotacion.spec.ts`, `validacion.spec.ts`) cambian el índice/rotación
esperados para seguir demostrando el mismo comportamiento ("Rn se ancla al colocador, no al
orden de saque tal cual se escribió") bajo la numeración correcta; 005-E4
(`sistema-recepcion.spec.ts`) reconstruye su fixture de "aviso al límite" a partir de
`formacionLegalPara` en vez de puntos y jugadores hardcodeados, porque la identidad
jugador↔Pn para R2 cambió. Ninguna regla de falta posicional cambia, solo qué formación física
corresponde a cada `Rn` — mismo patrón que dejó la propia ADR 0010 al tocar la spec 001.

El sustituto por defecto del líbero (`sustitutosLiberoPorDefecto`, ADR 0015) no cambia de
*regla* ("el central que cae en zaga en esa rotación"), pero sus valores concretos por `Rn`
cambian, porque ahora cada `Rn` apunta a una formación física distinta — es una consecuencia
mecánica, no una decisión nueva. `docs/dominio.md` §4 se corrige: ya no dice "R3 es su posición
natural de armado en la red" (era falso incluso bajo la propia ADR 0010, que habría dicho R5, no
R3, según su documento de referencia).
