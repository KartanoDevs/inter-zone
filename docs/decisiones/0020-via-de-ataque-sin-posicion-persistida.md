# 0020 — La vía de ataque se persiste como valor derivado, no como posición del rival

**Estado:** Aceptada

**Contexto.** La defensa (spec 021) se organiza contra una de cuatro vías de ataque (zona 4,
zona 3, zona 2, pipe), que el entrenador fija arrastrando una ficha rival genérica a su campo.
Había que decidir qué se guarda: la posición exacta donde se soltó la ficha, o solo la vía ya
resuelta a partir de ella.

**Decisión.** Se guarda únicamente la vía (`ViaAtaque`, un valor de cuatro), nunca la posición
del rival. Cada pestaña de vía muestra la ficha rival siempre en el mismo punto representativo
de esa zona (`PUNTO_POR_VIA` en `ui/pista/pista.ts`) — no en el punto exacto donde se soltó la
última vez.

**Consecuencias.** El modelo de dominio no necesita un campo de posición para el rival en
ninguna parte (`Sistema.defensas` solo guarda las posiciones de los seis defensores, igual que
`Sistema.formaciones`); no hay nada nuevo que persistir ni migrar en `infrastructure/`. La
ficha rival, en pantalla, siempre "salta" al punto canónico de su vía al recargar o cambiar de
pestaña, en vez de aparecer donde quedó la última vez — es una simplificación deliberada: la
vía es la única información táctica que importa (contra qué ataque se defiende), no la
profundidad o el ángulo exactos de un ataque concreto.
