# 0039 — Teoría tiene su propia navegación, no comparte la del editor

**Estado:** Aceptada

**Contexto.** La spec 052 necesitaba decidir cómo navega Teoría por rotaciones, caso, situación
y bloqueadores: reutilizando las signals de `SistemaStore` (`rotacionActiva`, `casoActivo`...) o
con las suyas propias. Compartirlas era menos código de entrada, pero un entrenador con cambios
sin guardar en el editor y un jugador abriendo Teoría al mismo tiempo (misma sesión de
navegador, dos pestañas del nav) habrían pisado el `borrador` del otro sin darse cuenta —
exactamente el caso que la spec 052 marcó como fuera de alcance en su propia sección de
escenarios (E9).

**Decisión.** Nace `TeoriaStore`, una clase nueva en `application/` con su propia navegación
(equipo, sistema, rotación, caso, situación, bloqueadores, jugador seleccionado) y sus propios
`computed` de lectura (formación activa, explicación, celdas, sombra) — calculados directamente
sobre el `Sistema` ya guardado, nunca sobre un `borrador` editable, porque Teoría no tiene
ninguno. Lee el catálogo de `SistemaStore.sistemas()` (inyectado), filtrado a los sistemas
validados (spec 051), pero no toca ninguna otra de sus signals.

**Consecuencias.** Duplica una porción real de la lógica de construcción de `FichaVista` /
`CeldaConjunto` / leyenda que ya vivía en `Tablero` — se aceptó el coste porque la alternativa
(que los dos compartieran estado) rompía la garantía de la spec 052, E9. Lo que sí se compartió,
al extraerlo a `ui/comun/ficha-vista.ts`, es la fontanería de etiquetas y color que no depende de
ningún estado, ni del editor ni de Teoría (`idOcupanteDe`, `indiceColorDe`, `ETIQUETA_PUESTO`...).
Esa extracción resolvió además un import circular entre `Tablero` y `TeoriaTablero` que apareció
al intentar reutilizar esas mismas funciones directamente desde `tablero.ts`.
