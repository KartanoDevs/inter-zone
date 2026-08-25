# 0034 — Cambiar a quién sustituye el líbero hereda el punto de quien sale

**Estado:** Aceptada

**Contexto.** `cambiarSustitutoLibero` (spec 017-E8) purgaba de la formación guardada al jugador
que dejaba de estar en pista, sin meter a quien entraba en su lugar. La formación se quedaba en
cinco de seis. Eso contradecía el invariante 2 de `docs/dominio.md` ("cada formación coloca
exactamente a 6 jugadores") desde el día en que se escribió la 017 — no lo cazó ningún test
porque el `RepositorioFake` de `sistema.store.spec.ts` no valida roster, y el test de dominio de
entonces solo comprobaba *quién* faltaba, nunca *cuántos* quedaban. En cuanto existió backend
(spec 033), el servidor empezó a rechazar esa formación con `RosterInvalido`: cambiar el
sustituto desde ajustes con un sistema ya creado fallaba siempre, con el sistema sembrado por
defecto (que trae formaciones en las seis rotaciones) como caso más visible.

**Alternativas consideradas.**

1. **Relajar la validación del servidor.** Descartada: tira la protección anti-roster de la spec
   033-E5 y rompe el invariante 2 directamente, en vez de corregir la causa.
2. **Purgar y mandar al banquillo.** El jugador que deja de estar sustituido volvería sin punto,
   a colocar a mano. Descartada: la formación seguiría en cinco hasta que el entrenador la
   completara, así que el servidor la seguiría rechazando al guardar — no arregla nada, solo
   traslada el problema al siguiente `guardar()`.

**Decisión.** `cambiarSustitutoLibero` (`domain/catalogo-sistemas.ts`) calcula el roster de la
rotación antes y después del cambio (`jugadoresEnPista`), y para cada posición cuyo ocupante
cambió, sustituye el `jugador` de esa colocación por el nuevo, conservando su `punto`,
`explicacion` y `celdas` intactos. La formación mantiene siempre los seis. Corrige la spec
017-E8, cuya redacción original quedó anotada como incorrecta en el propio fichero de la spec
(`docs/especificaciones/017-*.md`) en vez de reescrita en silencio.

**Consecuencias.** El punto, la explicación de enseñanza y las celdas pintadas de una posición de
la pizarra se entienden como propiedad de "ese sitio", no de qué jugador lo ocupó — coherente con
que son cosas que el entrenador anota sobre el diagrama, no sobre la persona. Un cambio de
sustituto puede mover a dos jugadores en una misma llamada (el que sale del líbero y el que
recupera su sitio de titular), nunca solo a uno, porque el líbero ocupa como mucho una posición
por rotación.
