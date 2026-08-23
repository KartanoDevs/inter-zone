# 040 — La sombra del bloqueo

**Estado:** Completada
**Paso de la hoja de ruta:** 7 (sistemas de defensa)

**Depende de:** specs 038 y 039 (caso de colocador, variantes por número de bloqueadores),
congeladas e implementadas antes de congelar esta.

## Problema

Un diagrama de defensa que solo muestra dónde se colocan los seis defensores no enseña la parte
más importante: **qué tapa el bloqueo**. La zona que la pared de bloqueadores le esconde al
atacante es la que decide dónde tiene que reaccionar la defensa de campo — es la pieza que une el
bloqueo (spec 039) con la colocación de zaga que ya existe. Hoy no se ve.

## Objetivo

Sobre el campo propio se ve la sombra que el bloqueo activo le proyecta al atacante: se calcula
sola a partir de dónde está el atacante y de qué puestos bloquean, se recalcula mientras se
mueve cualquiera de los dos, y además se puede arrastrar a mano para retocarla — el retoque se
guarda con la variante.

**Esta spec toca `application/`, `infrastructure/`, `server/` y `ui/`, además de `domain/`**, por
el mismo motivo que las dos anteriores.

## Fuera de alcance

- Cruzar la sombra con la rejilla de zonas de responsabilidad para calcular huecos o conflictos
  (specs 014-015): se deja anotado como extensión futura, no se implementa aquí.
- Cambiar el criterio de quién bloquea (ya fijado en la spec 039).
- Cualquier cambio en recepción: un sistema de recepción no tiene sombra, nunca la ha tenido.

## Escenarios

### Cálculo básico

**E1 — Con el bloqueo cerrado aparece la sombra, desde la red hacia el fondo**
- Dado: una variante con al menos un bloqueador y el atacante colocado
- Cuando: se mira el campo propio
- Entonces: se ve una superficie sombreada que nace en la red, en el tramo que cubren los
  bloqueadores, y se abre hacia el fondo del campo

**E2 — Sin bloqueadores no hay sombra**
- Dado: una variante de 0 bloqueadores
- Cuando: se mira el campo propio
- Entonces: no aparece ninguna sombra

**E3 — Mover al atacante recalcula la sombra mientras se arrastra, y al soltar la ficha vuelve a su punto canónico**
- Dado: una variante con bloqueo activo
- Cuando: se arrastra la ficha "A"
- Entonces: la sombra cambia en cada instante del arrastre, siguiendo la posición bajo el
  puntero; al soltar, la ficha encaja en el punto fijo de la situación activa (no se persiste una
  posición libre del atacante, `docs/decisiones/0020-*.md`) y la sombra recalcula desde ese punto

**E4 — Mover a un bloqueador recalcula la sombra en el momento**
- Dado: una variante con bloqueo activo
- Cuando: se mueve uno de los puestos que están bloqueando
- Entonces: la sombra cambia de inmediato, reflejando el nuevo tramo de red cubierto

**E5 — La sombra se recorta en las líneas del campo propio**
- Dado: una posición del atacante y del bloqueo tal que la proyección geométrica sin recortar
  saldría fuera del rectángulo de 9×9
- Cuando: se calcula la sombra
- Entonces: nunca se dibuja ni un centímetro fuera del campo propio

**E6 — Un bloqueo mal cerrado deja un pasillo de luz entre dos sombras**
- Dado: dos puestos bloqueando con una separación lateral notable entre ellos (más que el margen
  de un bloqueo bien cerrado)
- Cuando: se calcula la sombra
- Entonces: se ven dos superficies sombreadas separadas, con un pasillo sin sombra entre ambas —
  el hueco que un bloqueo mal cerrado deja pasar

**E7 — Dos bloqueadores juntos forman una sola sombra**
- Dado: dos puestos bloqueando muy próximos entre sí (dentro del margen de un bloqueo cerrado)
- Cuando: se calcula la sombra
- Entonces: se ve una única superficie continua, sin pasillo entre ellos

**E8 — Un ataque muy abierto con el bloqueo al otro lado no proyecta sombra dentro del campo**
- Dado: el atacante en un extremo del campo rival y el bloqueo entero desplazado hacia el
  extremo contrario
- Cuando: se calcula la sombra
- Entonces: la superficie recortada al campo propio queda vacía — no hay sombra que dibujar, y
  eso no es un error

**E9 — Un ataque pegado a la red tapa más campo que la misma pipe desde el fondo**
- Dado: dos variantes con el mismo bloqueo pero el atacante a distinta profundidad — una pegada
  a la línea de ataque rival, otra desde la pipe
- Cuando: se comparan las dos sombras
- Entonces: la del ataque pegado a la red cubre más superficie del campo propio que la de la
  pipe, con el mismo bloqueo

### Retoque manual

**E10 — Arrastrar la sombra la desplaza, y el desplazamiento se guarda con la variante**
- Dado: la sombra calculada de una variante
- Cuando: se arrastra a otra posición y se guarda
- Entonces: el desplazamiento queda asociado a esa variante concreta (ese caso, esa situación,
  ese número de bloqueadores), sin afectar a las demás

**E11 — Al recargar la página, la sombra vuelve a salir donde el entrenador la dejó**
- Dado: una variante con la sombra retocada y guardada
- Cuando: se recarga la página y se vuelve a esa variante
- Entonces: la sombra aparece con el mismo desplazamiento, calculada de nuevo desde el punto
  canónico del atacante más el desplazamiento guardado — nunca desde una posición libre
  persistida

**E12 — Un desplazamiento que saca la sombra del campo se recorta igual que la sombra sin retocar**
- Dado: un desplazamiento que llevaría la sombra parcial o totalmente fuera del rectángulo de 9×9
- Cuando: se aplica
- Entonces: se recorta en las líneas del campo, igual que en E5; si el recorte la vacía por
  completo, no se dibuja nada — es un estado válido, no un error

**E13 — Recentrar descarta el retoque y devuelve la sombra calculada**
- Dado: una variante con la sombra desplazada
- Cuando: se usa la acción de recentrar
- Entonces: la sombra vuelve a la posición que sale del cálculo puro, y el desplazamiento
  guardado se borra al guardar de nuevo

### Qué no es la sombra

**E14 — La sombra no es una zona de responsabilidad**
- Dado: una variante con sombra y con zonas de responsabilidad pintadas
- Cuando: se activa la vista de conjunto de zonas (spec 023/024) o se abre su leyenda
- Entonces: la sombra no aparece ni en la vista de colores ni en la leyenda de zonas — es un
  objeto de otra naturaleza, no cuenta como responsabilidad de ningún puesto

**E15 — Un sistema de recepción nunca tiene sombra**
- Dado: un sistema de recepción activo
- Cuando: se mira el campo
- Entonces: no hay bloqueo declarado, no hay atacante, y por tanto no hay sombra que calcular ni
  que mostrar

## Preguntas abiertas

Ninguna. Resueltas con el usuario antes de escribir esta spec:

- **La sombra se calcula geométricamente** desde el atacante y el vano de bloqueo — no es una
  forma fija que solo se coloca a mano.
- **Se puede retocar arrastrándola**, y el retoque se guarda; el cálculo puro no se persiste.
- **La posición del atacante nunca se persiste** (se mantiene la ADR 0020): el retoque guardado
  es solo el desplazamiento manual respecto al punto canónico de la situación activa.
- **La sombra es un polígono, no una rejilla de celdas**: distinto en su naturaleza a las zonas
  de responsabilidad (ADR 0004), aunque cruzarla con la rejilla queda anotado como trabajo futuro
  para huecos y conflictos.

## Al cerrar

Los 15 escenarios pasan. Suite de `domain/`, `application/` e `infrastructure/`: 275 al cerrar la
039 → 290 al cerrar esta. Suite de `server/`: 13, sin cambios de número — igual que con
`bloqueadores` en la 039, el esquema y el repositorio ya tenían `sombra_dx`/`sombra_dy` listos
desde la migración de la spec 038, así que no hizo falta ni migración ni código de servidor
nuevo. `npm run typecheck` y `npm run build` limpios en las tres capas.

**Único fichero de dominio nuevo: `domain/sombra-bloqueo.ts`.** El resto del trabajo real cayó en
`application/sistema.store.ts` (una signal nueva, `desplazamientoSombraEdicion`, y tres métodos:
`desplazarSombra`, `recentrarSombra`, y la ampliación de `cambiarContexto`/`guardar`) y en
`ui/pista/` + `ui/tablero/` (el polígono SVG, su arrastre, y el botón de recentrar).

**La fórmula geométrica se implementó de una vez, no escenario a escenario.** A diferencia del
resto de esta sesión (rojo → mínimo → verde por escenario), aquí se escribió primero un
escenario trivial (E2, sin bloqueadores no hay sombra, código mínimo real: `[]`) y después, para
E1, la geometría completa —fusión de tramos, proyección cónica, recorte Sutherland–Hodgman—
de golpe. Justificación explícita, no un atajo silencioso: fragmentar un recorte de polígono
convexo en piezas que pasaran un test cada una habría producido código a medio hacer en los
pasos intermedios (un recortador que solo funciona contra un borde, por ejemplo), que es
justo lo que el protocolo de esta sesión prohíbe generar. El resto de escenarios (E5-E13) sí
llegaron uno a uno contra esa implementación ya completa, cada uno con su rojo genuino antes de
confirmarse en verde — dos de ellos (E5-E13 sobre el mismo cálculo) fallaron primero por
geometría de prueba mal elegida, no por el código de producción: el test de E10-E11 tuvo que
ajustarse dos veces (profundidad del atacante, magnitud del desplazamiento) hasta dar con una
combinación que no tocara los bordes del campo y permitiera comparar vértice a vértice — el
propio cono se abre más de lo intuitivo cerca de la red, y hubo que calcular el ancho real en
`y=9` antes de fijar los números del escenario en vez de adivinarlos.

**Decisiones de implementación tomadas sin devolver la pregunta al usuario**, documentadas aquí
por transparencia, todas ya previstas y justificadas en el plan de diseño previo a esta spec:
`ANCHO_BLOQUEADOR = 1` m (las manos de un bloqueador tapan ~1 m de red); `HOLGURA_VANO = 0.15` m
para fusionar tramos en una pared cerrada (E6-E7); `PROFUNDIDAD_MINIMA = 0.2` m como cota inferior
de la profundidad del atacante, para que el cono no se vuelva infinito si se coloca justo sobre
la red; y que en `puestosQueBloquean(...)` con empate exacto de distancia a la red (ningún
escenario lo especifica) gane el orden de aparición en la formación, por ser el comportamiento
natural de un `sort` estable sin ninguna regla añadida encima.

**El botón de recentrar solo aparece cuando hay algo que recentrar**
(`store.desplazamientoSombraEdicion()` no nulo): no estaba en ningún escenario explícito, pero
es la lectura directa de E13 ("recentrar descarta el retoque") — mostrarlo siempre invitaría a
pulsarlo sobre una sombra ya calculada, sin ningún efecto visible.

**`docs/dominio.md` gana una subsección nueva** ("La sombra del bloqueo", bajo la sección de
defensa) con la simplificación geométrica explicada en lenguaje de voleibol: el bloqueo se lee
como un tramo de red, no como una pared a la altura del jugador. `docs/arquitectura.md` gana
`sombra-bloqueo.ts` en la lista de `domain/`, la ampliación de `application/` y `ui/`, y una nota
sobre el esquema del servidor ya cerrado desde la spec 038.

**Dos ADR nuevos**, ambos ya anticipados y redactados en el plan de diseño antes de escribir la
spec: **0032** (la sombra es geometría derivada, un polígono SVG y no una rejilla de celdas —
acota la ADR 0004 sin contradecirla, y deja anotado `celdasDeSombra()` como puerta futura para
huecos y conflictos, sin implementarla) y **0033** (la posición del atacante sigue sin
persistirse — extiende la ADR 0020 — y lo único que se guarda del retoque de sombra es el
desplazamiento manual).

**Lo que no se desvió:** las cuatro decisiones cerradas con el usuario antes de escribir la spec
(cálculo geométrico real en vez de una forma fija, retoque manual arrastrable, posición del
atacante nunca persistida, y polígono en vez de rejilla) se implementaron exactamente como se
acordaron. Con esta spec se completa el trío 038-039-040 de la reestructuración de defensa.
