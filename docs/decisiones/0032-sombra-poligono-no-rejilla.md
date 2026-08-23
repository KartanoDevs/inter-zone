# 0032 — La sombra de bloqueo es geometría derivada: polígono, no rejilla

**Estado:** Aceptada

**Contexto.** La ADR 0004 eligió una rejilla de celdas de 0,5 m para las *zonas de
responsabilidad*, descartando explícitamente círculos, elipses y polígonos de vértices
arrastrables. La spec 040 necesitaba decidir si la sombra de bloqueo —una superficie nueva, de
naturaleza distinta— seguía esa misma representación o no.

**Decisión.** La sombra es un polígono SVG, calculado geométricamente y recortado al campo, no
una lista de celdas de la rejilla.

**Por qué no se aplica la ADR 0004 aquí.** Las dos razones que motivaron la rejilla no valen para
la sombra:

1. *"Se pinta con el dedo en tablet."* La sombra no se pinta a mano — se calcula sola desde la
   posición del atacante y de los bloqueadores, y se recalcula en cada `pointermove` mientras se
   arrastra cualquiera de los dos (spec 040, E3-E4). Discretizarla a 324 celdas en cada frame de
   arrastre es trabajo de más sin ninguna ganancia, y el borde dentado que produciría competiría
   visualmente con la rejilla de colores ya pintada debajo.
2. *"Los huecos y conflictos se calculan contando responsables por celda."* La sombra no tiene
   responsable que contar: no es la zona de nadie, es lo que el bloqueo le tapa al atacante. Un
   objeto de otra naturaleza debe leerse como tal (spec 040, E14): relleno oscuro traslúcido, sin
   ningún color de la paleta de jugadores, fuera de la vista de colores y de su leyenda.

**Consecuencias.** `domain/sombra-bloqueo.ts` usa el mismo tipo `Punto` que el resto del dominio,
sin `Celda`. El recorte a las líneas del campo se hace con Sutherland–Hodgman sobre el rectángulo
`[0,9]×[0,9]`, sin librerías de geometría computacional — ~30 líneas, TypeScript puro, coherente
con el resto de `domain/` (invariante 2 de `CLAUDE.md`).

**Puerta abierta, sin abrirla ahora.** Cuando lleguen huecos y conflictos (specs 014-015) hará
falta cruzar la sombra con la rejilla de zonas de responsabilidad — un ataque cuya zona de caída
más probable, según el bloqueo, no la cubre nadie es justo el tipo de hueco que la herramienta
debería señalar. Entonces, y no antes, se añadiría `celdasDeSombra(poligonos): readonly Celda[]`
(centro de celda dentro del polígono). No se implementa en la spec 040 porque ningún escenario lo
pide todavía, y adelantarlo sin un test que lo exigiera habría sido código sin verificar.
