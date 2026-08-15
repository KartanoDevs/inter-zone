# 0017 — El índice de rol se declara, no se deriva

**Estado:** Aceptada

**Contexto.** La spec 017 (ADR 0015) giró el recorrido de `asignarIndices` para que `C1` fuera
el central que arranca en zaga, corrigiendo el sentido equivocado que llevaba desde la spec 006.
Pero al comparar la pizarra con seis rotaciones reales aportadas por el usuario, solo los
centrales quedaron bien: los dos receptores salieron con la etiqueta invertida en las seis. La
causa es más profunda que un sentido de recorrido equivocado: **la convención real del
entrenador no sale de un único recorrido**. En R1, con el colocador en P1, nombra `R1` al
receptor de P2 (contando hacia delante desde el colocador) y `C1` al central de P6 (contando
hacia atrás). Ninguna dirección de recorrido produce ambas etiquetas a la vez — es la tercera
vez que se intenta derivar el índice (specs 006, 017, y el intento fallido que motiva esta
decisión) y la tercera que falla, cada vez de una forma distinta.

**Decisión.** El índice deja de derivarse. `asignarIndices` (`domain/plantilla.ts`) se retira
por completo; `Jugador.indice` pasa a ser un dato que la plantilla declara directamente, igual
que ya trataba la ADR 0008 (`Jugador.indice` como dato almacenado, no derivado por
construcción). `validarPlantilla` queda como la única comprobación: que los índices declarados
sean coherentes (un rol con índice tiene exactamente un 1 y un 2 en pista), sin imponer ningún
orden de asignación. `docs/dominio.md` §2 dice explícitamente que no hay que volver a intentarlo
— tres intentos fallidos con tres reglas distintas es la señal de que el problema no es la
regla, es que no existe una regla de recorrido que capture la convención real.

**Consecuencias.** `plantilla-global.ts` declara el orden de la única plantilla de la v1 con el
índice escrito a mano, con un comentario que avisa explícitamente de que el sufijo del *id*
(`central1`) no coincide con la etiqueta (`central1` se pinta `C2`) — es la confusión concreta
que causó el problema, así que queda anotada donde es más probable que alguien vuelva a caer en
ella. Se retira el `describe('asignarIndices')` de `plantilla.spec.ts` (017-E1, 017-E2, 017-E3 y
el E11 heredado de la spec 002); su intención pasa a dos tests nuevos, más simples, que
verifican que la etiqueta es la declarada y que no cambia al rotar. `maqueta/datos-ejemplo.ts`
(boceto congelado) declara sus índices a mano, sin cambiar su comportamiento visual.

Al verificar la tabla completa de seis rotaciones contra los ejemplos del usuario apareció un
segundo bug, independiente de este: el numerador `Rn` en sí (`formacionEnRotacion`, ADR 0010) no
coincide con la convención real. Queda fuera de esta decisión — lo cubre la spec 019 — porque es
un problema distinto (qué formación física corresponde a cada `Rn`, no qué etiqueta lleva cada
jugador) con su propio radio de impacto.
