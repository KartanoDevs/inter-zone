# 0033 — Del atacante se sigue sin persistir la posición; se persiste el retoque de la sombra

**Estado:** Aceptada

**Contexto.** La ADR 0020 (spec 021, precisada por la 038) decidió que la vía/situación de
ataque se persiste como valor ya derivado, nunca como la posición exacta donde se soltó la ficha
rival. La spec 040 añade un segundo elemento arrastrable en el campo rival —la ficha "A"— y uno
en el campo propio —la sombra de bloqueo—, y ambos necesitaban la misma decisión: ¿qué posición,
si alguna, se guarda?

**Decisión.** Se guarda únicamente el desplazamiento manual de la sombra respecto a su posición
calculada (`VarianteDefensa.desplazamientoSombra: Punto`, opcional). La posición del atacante
sigue sin persistirse en ningún caso.

**Cómo encaja con el arrastre en vivo.** Mientras se arrastra la ficha "A", la sombra se
recalcula en cada instante desde el punto bajo el puntero (spec 040, E3) — es el momento
didáctico: *"mira cómo se abre la sombra si el ataque viene más cerrado"*. Al soltar, la ficha
encaja en el punto canónico de la situación que resulte (mismo mecanismo que la ADR 0020), y la
sombra se recalcula desde ahí. Ningún punto libre del atacante llega nunca a `guardar()`.

**Por qué no se persiste también la posición del atacante.** Es la alternativa obvia —guardar
`atacante_x`/`atacante_y` por variante— y se descartó por tres motivos:

1. Rompería la ADR 0020 sin ninguna necesidad nueva: la vía/situación sigue siendo toda la
   información táctica que importa (contra qué ataca el rival), no el punto exacto.
2. Crearía dos fuentes de verdad para la misma cosa: la situación (la clave de la variante) y el
   punto guardado podrían discrepar si alguna vez se editara uno sin el otro.
3. Costaría dos columnas más en `formacion_defensa` sin que ningún escenario de la 040 lo pidiera.

**Consecuencias.** `guardarVarianteDefensa` acepta un sexto parámetro opcional
`desplazamientoSombra?: Punto`; ausente, borra cualquier desplazamiento que la variante tuviera
antes (spec 040, E13 — recentrar y volver a guardar). El servidor guarda `sombra_dx`/`sombra_dy`
como columnas nulas en pareja (`CHECK (sombra_dx IS NULL) = (sombra_dy IS NULL)`), ya incluidas
en la migración de la spec 038 sin esperar a esta. Un desplazamiento que saca la sombra fuera del
campo se recorta exactamente igual que la sombra sin retocar (E12): no hay ningún tope explícito
al desplazamiento, el recorte al campo ya lo resuelve.
