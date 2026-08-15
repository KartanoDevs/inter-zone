# 018 — El índice de rol se declara, no se deriva

**Estado:** Completada
**Paso de la hoja de ruta:** 3 (corrección de la spec 017, descubierta al comparar las seis
rotaciones de la pizarra con ejemplos reales de un 5-1)

## Problema

Con la pizarra delante de un equipo real, las seis rotaciones no coinciden con lo que el
entrenador espera: los dos receptores salen con la etiqueta cambiada en las seis. La causa es que
`asignarIndices` deriva el índice recorriendo el orden de saque en una única dirección, pero la
convención real del entrenador no sale de un recorrido único — en R1, con el colocador en P1,
nombra `R1` al receptor de P2 (contando hacia delante) y `C1` al central de P6 (contando hacia
atrás). Ninguna dirección de recorrido produce ambas etiquetas a la vez.

## Objetivo

El índice de un rol (1 o 2) es un dato que declara la plantilla, no algo que se calcule
recorriendo el orden de saque. Las seis rotaciones de un 5-1 real coinciden con lo que el
entrenador espera.

## Fuera de alcance

- El defecto del sustituto del líbero por rotación (spec 017): ya coincide con la referencia y
  no se toca.
- La forma persistida de un sistema: el índice sigue viajando en cada `Jugador` igual que hoy;
  no cambia ningún tipo de `infrastructure/`, así que la versión persistida se queda en 3.
- Nada de `ui/`: las etiquetas se pintan con `etiquetaDe`, que no cambia.

## Escenarios

**E1 — El índice de un rol es el que declara la plantilla**
- Dado: dos jugadores del mismo rol con índice 1 y 2 ya declarados, en cualquier posición del
  orden de saque
- Cuando: se consulta su etiqueta
- Entonces: es la que llevan declarada, sin depender de en qué Pn caiga cada uno en ninguna
  rotación

**E2 — Una plantilla con índices incoherentes se rechaza**
- Dado: un orden de saque con dos jugadores del mismo rol con el mismo índice, o un rol que
  lleva índice sin declararlo
- Cuando: se valida la plantilla
- Entonces: se rechaza — `validarPlantilla` es la única comprobación que queda, ya no hay una
  función que derive un índice siempre coherente por construcción

**E3 — Rotar no cambia el índice de nadie**
- Dado: un jugador con índice declarado
- Cuando: se calcula su etiqueta en cada una de las seis rotaciones
- Entonces: es la misma en todas — el índice es del jugador, no de la casilla que ocupe

**E4 — Las seis rotaciones del 5-1 de referencia colocan a cada jugador donde toca**
- **Retirado de esta spec, ver "Al cerrar".** Al escribir su test se descubrió un segundo bug,
  independiente de este y fuera del alcance declarado arriba: el numerador `Rn` en sí
  (`formacionEnRotacion`/`rotacionDe`, ADR 0010) no coincide con la convención real del
  entrenador. E4 solo puede verificarse una vez ese numerador esté corregido, así que pasa a la
  spec 019, que es quien lo hace. La tabla de referencia sigue siendo válida y es la que usará
  esa spec.

## Preguntas abiertas

Ninguna. Resueltas con el usuario antes de escribir esta spec:

- **El índice se declara, no se deriva.** Se descartaron dos alternativas: mantener un recorrido
  único (imposible, la convención real no sale de uno) y usar un recorrido distinto por rol
  (introduce una segunda regla donde antes había una, sin necesidad real). Declarar el índice es
  además coherente con la ADR 0008, que ya trataba `Jugador.indice` como un dato almacenado y
  `asignarIndices` como una utilidad de conveniencia, no la única fuente de verdad.
- **La tabla de seis rotaciones de arriba es la fuente de verdad de esta spec**, verificada
  directamente contra ejemplos reales aportados por el usuario, no derivada de ninguna regla de
  recorrido.

## Al cerrar

E1, E2 y E3 pasan (138 tests en `domain/`, `application/` e `infrastructure/`; 140 antes de
esta spec, menos los 4 tests de `asignarIndices` que se retiran, más los 2 nuevos). E2 no
necesitó test propio: ya estaba cubierto por E7-E9 de `plantilla.spec.ts` (spec 002), que
prueban exactamente lo que `validarPlantilla` sigue comprobando sin cambios.

**El alcance real fue menor de lo previsto, y por un motivo importante.** El plan original tenía
un cuarto escenario, E4, que recorría las seis rotaciones de la plantilla global y las comparaba
con la tabla de referencia completa. Al escribir su test se descubrió que **no pasaba, y no por
culpa del índice**: `R2`, `R3`, `R5` y `R6` salían con el contenido de otra rotación de la propia
tabla (`R2`↔`R6`, `R3`↔`R5`), mientras que `R1` y `R4` sí coincidían. La causa es un segundo bug,
completamente independiente del índice de rol: el numerador `Rn` (ADR 0010, "`Rn` significa el
colocador ocupa `Pn`") no coincide con la convención real del entrenador, donde `Rn` es
literalmente la rotación física número `n` en la secuencia de juego — ambas definiciones solo
coinciden en `R1` y `R4`. Se paró la implementación, se confirmó el hallazgo con el usuario, y
se decidió sacarlo a una spec aparte (019) en vez de ampliar esta, porque el radio de impacto es
distinto y mucho mayor: toca `formacionEnRotacion`/`rotacionDe` en `rotacion.ts`, que es el
motor de rotación de toda la app (validación, líbero por rotación, pestañas R1-R6). E4 se
retiró de esta spec; su tabla de referencia sigue siendo válida y la reutilizará la 019.

**Lección para `docs/dominio.md`:** ya van tres intentos fallidos de derivar el índice de rol
por recorrido (specs 006, 017, y el descartado por esta spec), cada uno con una regla distinta.
Se ha dejado escrito explícitamente en el dominio que no hay que volver a intentarlo — el
patrón de "tres reglas distintas, las tres incorrectas" es la señal de que el problema no
estaba en la regla, sino en la premisa de que existía una regla de recorrido que capturase la
convención real.

**Lo que no se desvió:** E1 y E3 se implementaron tal como se habían planificado, sin
sorpresas.
