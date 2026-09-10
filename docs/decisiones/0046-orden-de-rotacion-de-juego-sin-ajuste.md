# 0046 — El orden de rotación de juego es fijo, sin ajuste

**Estado:** Aceptada

## Contexto

Desde la spec 044, `PanelAjustes` ofrecía un interruptor «Pestañas de rotación en orden de
juego (R1, R6, R5, R4, R3, R2)» frente al orden numérico simple (R1..R6), guardado en
`localStorage` (`ordenRotacionCronologico`, por defecto `false`). Solo afectaba a las pestañas
de la ventana Edición (`Tablero`); Teoría y Examen se quedaban siempre en el orden numérico, y
en Examen ese orden numérico también decidía en qué secuencia avanzaba el alumno rotación a
rotación.

Usar la app en el móvil dejó claro que el orden numérico no es el que se enseña ni se examina
nunca en la pista real: el entrenador y el árbitro razonan en el orden P2→P1→P6→P5→P4→P3, no en
1→2→3→4→5→6. Tener las dos formas disponibles, además, solo en una ventana y detrás de un
ajuste que arranca desactivado, hacía que la mayoría de sesiones nunca llegaran a verlo.

## Decisión

El orden de juego (`ORDEN_ROTACIONES = [1, 6, 5, 4, 3, 2]`, `domain/rotacion.ts`) pasa a ser el
único orden de presentación de las pestañas de rotación en toda la app — Edición, Teoría y
Examen —, y también el orden en el que Examen ofrece la siguiente rotación sin corregir. Se
retira el ajuste: `PanelAjustes` pierde el interruptor, `Ajustes.ordenRotacionCronologico`
desaparece de `domain/puertos.ts`, y `LocalStorageAjustesRepository` sube de versión (7 → 8)
para que un dispositivo que tuviera el ajuste desactivado (su valor por defecto) también pase
al nuevo comportamiento único, en vez de conservar un campo fantasma.

No hay ninguna regla de voleibol nueva aquí: `ORDEN_ROTACIONES` es una lista de presentación,
no una condición que `validarFormacion` (`domain/validacion.ts`) evalúe. Por eso este cambio se
trata como reordenar cómo se listan datos existentes, no como lógica de dominio nueva, y no ha
pasado por el protocolo de specs congeladas — es una decisión consciente del propietario del
producto, documentada aquí para que quede constancia de que fue deliberada.

Defensa no tiene pestañas de rotación (va por caso y situación del colocador rival desde la
spec 038), así que no hay nada que reordenar ahí.
