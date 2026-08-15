# 0010 — `Rn` se numera anclada al colocador, no al orden de saque tal cual se definió

**Estado:** Sustituida por 0018 (el anclaje al colocador para fijar R1 sigue vigente; "Rn =
colocador en Pn" para n>1 no)

**Contexto.** La decisión 0005 deriva las rotaciones rotando el orden de saque, pero no fija
qué desplazamiento corresponde a cada `Rn`. El código lo resolvía numerando desde el orden tal
cual se escribió (`rotacion=0` era el propio orden). El equipo quiere `Rn` con el significado
habitual del sistema 5-1: "el colocador ocupa Pn". Si el orden de saque no arrancaba con el
colocador en P1, las dos numeraciones daban formaciones distintas para el mismo `Rn`.

**Decisión.** `Rn` significa siempre "el colocador ocupa la posición rotacional Pn", con
independencia de cómo se definió el orden de saque. Esto corrige también `validarFormacion`
(spec 001): su parámetro `rotacion` pasa a interpretarse igual, así que un mismo concepto de
rotación vale en todo el dominio, sin que convivan dos numeraciones distintas bajo el mismo
nombre `Rn`. La derivación reutiliza el mismo mecanismo de "rotar desde el colocador" que ya
usaba `plantilla.ts::asignarIndices` (decisión 0008) para asignar índices de receptor/central.

**Consecuencias.** Precisa la decisión 0005: el orden de saque se sigue definiendo una única
vez y las rotaciones se siguen derivando, pero ahora con una numeración concreta y sin
ambigüedad. Los escenarios E1–E15 de la spec 001 (ya `Completada`) cambian el valor de
`rotacion` que pasan a `validarFormacion` para seguir probando las mismas formaciones bajo la
numeración correcta; ninguna regla de falta posicional cambia, solo qué número de rotación le
corresponde a cada una. Anotado en el "Al cerrar" de la spec 001.
