# 040 — La sombra del bloqueo

**Estado:** Congelada
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

Pendiente — se completa cuando la spec esté implementada.
