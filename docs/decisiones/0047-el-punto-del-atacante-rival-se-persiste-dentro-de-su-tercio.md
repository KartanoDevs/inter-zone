# 0047 — El punto del atacante rival se persiste, dentro de su tercio

**Estado:** Aceptada

**Contexto.** La ADR 0020 (spec 021) y la ADR 0033 (spec 040) decidieron que del atacante rival
solo se guarda la vía/situación ya derivada, nunca su posición exacta — tres razones: evitar dos
fuentes de verdad, ninguna necesidad que lo pidiera, y el coste de columnas nuevas sin uso. La
spec 072 apareció porque el entrenador sí necesita afinar dentro de una situación (marcar que un
ataque por 4 viene muy pegado a la antena, no centrado en el tercio), lo que directamente
invalida la segunda razón de la 0033: ya hay una necesidad.

**Decisión.** Se guarda el punto exacto donde se suelta la ficha "A", como `VarianteDefensa.
marcadorAtacante?: Punto` (mismo criterio de opcionalidad que `desplazamientoSombra`, spec 040).
Pero la **situación sigue siendo la única identidad de la variante** — `(caso, situacion,
bloqueadores)`, sin cambios. Soltar la ficha fuera del tercio de la situación activa sigue
cambiando de variante exactamente como antes (`situacionMasCercana`, sin tocar); el punto
guardado solo afina *dentro* del tercio que ya decidió a qué variante pertenece.

Esto resuelve la primera razón de la 0033 (dos fuentes de verdad) sin descartarla: el punto
nunca puede contradecir a la situación, porque nunca decide a cuál pertenece — solo se lee
después de que la situación ya esté fijada.

**Reutilizado para más de una ficha.** El mismo mecanismo (`VarianteDefensa`, opcional, por
variante) es la base compartida sobre la que se apoyarán, si se implementan, el central rival
(spec 073, en borrador) y el banquillo rival (spec 074, en borrador) — un `MarcadorRival`
genérico en vez de tres campos sueltos, aunque esta spec concreta solo introdujo el del atacante.

**Consecuencias.** `guardarVarianteDefensa` acepta un octavo parámetro opcional
`marcadorAtacante?: Punto`; ausente, borra cualquier marcador que la variante tuviera — mismo
comportamiento que `desplazamientoSombra`. El servidor guarda `atacante_x`/`atacante_y` como
columnas nulas en pareja (`CHECK (atacante_x IS NULL) = (atacante_y IS NULL)`, migración
`20260924120000_punto_atacante_rival`), mismo patrón que `sombra_dx`/`sombra_dy`. Las variantes
guardadas antes de esta spec no se migran: nacen sin marcador, indistinguibles de como se veían
antes (mismo criterio que la ADR 0030).

**Por qué no sustituye del todo a la 0020/0033.** Ambas ADR siguen vigentes en lo esencial: la
vía/situación sigue siendo la información táctica que identifica una variante, y sigue siendo
obligatoria incluso sin marcador. Esta decisión solo añade un refinamiento opcional *dentro* de
esa identidad — de ahí "parcialmente" en las referencias cruzadas del código y de la spec 072,
no una sustitución.
