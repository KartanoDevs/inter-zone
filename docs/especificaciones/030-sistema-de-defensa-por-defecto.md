# 030 — Sistema de defensa por defecto, especializado por zonas

**Estado:** Completada
**Paso de la hoja de ruta:** No encaja en ningún paso: siembra un segundo dato de ejemplo, como
la spec 025. Sustituye a la spec 029, descartada.

## Problema

Solo existe un sistema de ejemplo (recepción a 3, spec 025). El equipo tiene un sistema
defensivo propio documentado en `docs/voley/sistema_defensivo_unificado.md`, con reglas
explícitas de especialización por zonas, que no tiene dónde vivir en la app.

El intento anterior (spec 029, descartada) colocaba a cada jugador **según su posición
rotacional** P1..P6. Eso contradice de raíz este sistema: en R2 el líbero ocupa P1, así que
aquella versión lo plantaba en la zaga derecha cuando la primera regla del documento es que el
líbero defiende **siempre** en zona 5.

## Objetivo

Al abrir la app sin nada guardado, además del sistema de recepción, aparece «Defensa
especializada por zonas» con veinticuatro formaciones (seis rotaciones × cuatro vías de ataque),
cada una con sus seis defensores colocados **según su rol, no según su posición rotacional**, su
zona de responsabilidad pintada, descripción general del sistema, explicación de conjunto por
rotación y explicación de cada jugador.

## La propiedad que sostiene el sistema

El documento fija las zonas por especialista: líbero en Z5, receptor en Z6, colocador u opuesto
en Z1. Para que eso sea posible en las seis rotaciones, hace falta que en todas ellas la zaga
contenga exactamente un líbero, un receptor y uno de los otros dos. **Se cumple**, verificado
rotación a rotación con la plantilla actual (líbero sustituyendo al central que cae en zaga):

| App | Zaga (P1, P5, P6) | Delantera (P2, P3, P4) |
|---|---|---|
| R1 | colocador, receptor 2, **líbero** | receptor 1, central, opuesto |
| R2 | **líbero**, opuesto, receptor 2 | colocador, receptor 1, central |
| R3 | receptor 2, **líbero**, opuesto | central, colocador, receptor 1 |
| R4 | opuesto, receptor 1, **líbero** | receptor 2, central, colocador |
| R5 | **líbero**, colocador, receptor 1 | opuesto, receptor 2, central |
| R6 | receptor 1, **líbero**, colocador | central, opuesto, receptor 2 |

En las seis: zaga = líbero + un receptor + (colocador u opuesto); delantera = un central + un
receptor + (colocador u opuesto). No es casualidad, es consecuencia de que el líbero sustituya
siempre al central de zaga en un 5-1: los dos centrales están en diagonal, igual que colocador y
opuesto, e igual que los dos receptores, así que cada pareja reparte un jugador a cada línea.

Consecuencia de diseño: la posición física y la zona de cada jugador se derivan de **su rol y de
si está en delantera o en zaga**, nunca de su posición rotacional. La geometría se declara una
vez por (zona física, vía) — veinticuatro combinaciones — y vale para las seis rotaciones; lo que
cambia de una rotación a otra es solo **quién** ocupa cada zona.

## Fuera de alcance

- **No se toca `plantilla-global.ts`** ni la sustitución del líbero por defecto.
- **No se calculan huecos ni conflictos** (specs 014-015, sin escribir). Las zonas pintadas son
  las responsabilidades que asigna el documento, no una afirmación de que entre las seis cubran
  el campo entero: donde el documento no asigna a nadie, la celda queda sin cubrir, y eso es un
  dato honesto, no un descuido.
- **No se modela la secuencia de la jugada** (posición inicial, de lectura, de ajuste): se pinta
  una única posición por jugador, la de lectura, que es la que decide su área.
- **No se valida la posición**: en defensa esa regla no existe (spec 021).

**Esta spec toca `infrastructure/`, además de `domain/`** — sembrar un segundo sistema por
defecto es una decisión de qué se entrega al arrancar sin datos, igual que autorizó la spec 025.

## Decisiones tomadas al congelar

1. **Contra ataque rival por zona 3, asiste al bloqueo el jugador de nuestra zona 4.** El
   documento admite «Zona 4 (o Zona 2, dependiendo de la lectura)»; una pizarra tiene que dibujar
   una, y se elige la primera que nombra. El jugador libre (Z2) se cierra hacia el centro en los
   3 metros, como dice el documento.
2. **La explicación de conjunto es por rotación, no por rotación y vía.** El modelo solo tiene
   una entrada por rotación (`explicacionesRotacion`), y aquí encaja bien: lo que cambia entre
   rotaciones es el reparto de zonas entre jugadores, que es idéntico en las cuatro vías. El
   detalle táctico de cada vía va en la explicación de cada jugador, que sí es por vía.
3. **El bloqueo doble se dibuja con una columna de celdas compartida** entre el central y el
   bloqueador de banda: es la forma de ver que cierran sin costura, que es justo lo que el
   documento pide vigilar («si el central llega tarde se abrirá una brecha por el medio»).

## Escenarios

### El reparto por zonas

**E1 — En las seis rotaciones la zaga es líbero, un receptor y colocador u opuesto**
- Dado: la plantilla por defecto
- Cuando: se mira quién ocupa P1, P5 y P6 en cada rotación
- Entonces: siempre hay exactamente un líbero, exactamente un receptor y exactamente uno entre
  colocador y opuesto

**E2 — El líbero defiende la zona 5 en las seis rotaciones y las cuatro vías**
- Dado: el sistema de defensa por defecto
- Cuando: se mira dónde está colocado el líbero en cualquiera de las 24 formaciones
- Entonces: está en la zona 5 del campo propio (zaga izquierda)

**E3 — El receptor zaguero defiende la zona 6**
- Dado: el sistema de defensa por defecto
- Cuando: se mira al receptor que está en zaga, en cualquiera de las 24 formaciones
- Entonces: está en la zona 6 (zaga centro)

**E4 — El colocador o el opuesto, el que esté en zaga, defiende la zona 1**
- Dado: el sistema de defensa por defecto
- Cuando: se mira al colocador o al opuesto que esté en zaga
- Entonces: está en la zona 1 (zaga derecha)

**E5 — El central delantero está siempre junto a la red**
- Dado: el sistema de defensa por defecto
- Cuando: se mira al central en cualquiera de las 24 formaciones
- Entonces: está pegado a la red. Su posición lateral **no** es fija: parte de la zona 3 y se
  desplaza hacia el lado del ataque para cerrar el doble bloqueo, que es justo lo que el
  documento le exige. Solo contra el centro y contra la pipe se queda en el tercio central

### El bloqueo

**E6 — Contra los extremos, el central cierra el doble bloqueo con el jugador de banda**
- Dado: una formación contra ataque por zona 2 o por zona 4 del rival
- Cuando: se comparan las zonas del central y del jugador de la banda por donde viene el ataque
- Entonces: ambos están junto a la red, en el lado del ataque, y sus zonas comparten al menos una
  celda — el doble bloqueo cierra sin costura

**E7 — Contra la pipe solo bloquea el central, y las dos bandas se descuelgan**
- Dado: una formación contra ataque de pipe
- Cuando: se mira a los tres delanteros
- Entonces: el central está junto a la red y los jugadores de zona 4 y zona 2 están los dos en la
  línea de 3 metros

### Geometría del conjunto

**E8 — Las cuatro vías tienen formación en las seis rotaciones**
- Dado: el sistema de defensa por defecto
- Cuando: se mira `defensas`
- Entonces: las seis rotaciones tienen formación para `z4`, `z3`, `z2` y `pipe` — veinticuatro en
  total, cada una con los seis jugadores que están en pista en esa rotación

**E9 — Las formaciones contra zona 2 y contra zona 4 son simétricas**
- Dado: las formaciones contra `z2` y contra `z4` de una misma rotación
- Cuando: se refleja la de `z2` respecto al eje central del campo
- Entonces: se obtienen los mismos puntos que en la de `z4` — el sistema es el mismo por los dos
  extremos, con los papeles de zona 5 y zona 1 intercambiados

### Zonas y textos

**E10 — Cada jugador de cada formación trae zona de responsabilidad pintada**
- Dado: el sistema de defensa por defecto
- Cuando: se miran las celdas de cada jugador en cada una de las 24 formaciones
- Entonces: ninguna está vacía, y todas sus celdas caen dentro del campo propio

**E11 — Cada jugador trae explicación propia y cada rotación su explicación de conjunto**
- Dado: el sistema de defensa por defecto
- Cuando: se leen las explicaciones
- Entonces: cada jugador de cada formación tiene la suya, y cada rotación tiene la de conjunto

**E12 — El sistema trae descripción general**
- Dado: el sistema de defensa por defecto
- Cuando: se lee su campo `descripcion`
- Entonces: no está vacío y resume los principios del sistema

### Siembra y persistencia

**E13 — Se siembra junto al de recepción cuando no hay nada guardado**
- Dado: no hay ningún payload legible en `localStorage`
- Cuando: se abre la app
- Entonces: el catálogo trae el sistema de recepción (spec 025) y este de defensa

**E14 — Es un sistema corriente: se puede editar y volver a guardar**
- Dado: el sistema de defensa por defecto
- Cuando: se mueve una ficha en una formación y se guarda
- Entonces: la formación queda actualizada, igual que en cualquier defensa creada a mano

**E15 — Ida y vuelta por el repositorio conserva las 24 formaciones con sus zonas**
- Dado: el sistema de defensa por defecto
- Cuando: se guarda y se vuelve a leer con `LocalStorageSistemaRepository`
- Entonces: las 24 formaciones, sus explicaciones y sus zonas llegan idénticas

## Preguntas abiertas

Ninguna. La única ambigüedad del documento (quién asiste al bloqueo contra un ataque por el
centro) queda resuelta en «Decisiones tomadas al congelar».

## Al cerrar

Los 15 escenarios pasan. Partida: 230 tests (tras revertir la spec 029); al cerrar, 245 — 15
nuevos: 13 en `domain/sistema-defensa-por-defecto.spec.ts` y 2 en
`infrastructure/local-storage-sistema.repository.spec.ts` (E13, E15). E13 arrastró además la
actualización de seis tests ya existentes de las specs 008/025 que asumían un único sistema
sembrado, igual que pasó al introducir la siembra en la 025.

**Lo que esta spec hace distinto de la 029, descartada.** Aquélla colocaba por posición
rotacional (P1..P6) y por eso plantaba al líbero en la zaga derecha en las rotaciones donde
ocupa P1. Aquí el reparto se deriva del **rol** y de la línea (delantera o zaga), que es lo que
el documento del equipo pide, y la geometría se declara una sola vez por (zona física, vía) en
vez de por rotación. El resultado son 24 formaciones a partir de 24 puntos y 24 zonas, no 144
datos sueltos.

**Orden de implementación alterado a propósito:** E6 (el doble bloqueo comparte celda) se
implementó después de E10 (las zonas existen), porque no se puede comprobar que dos zonas
comparten una celda antes de que haya zonas. Se anunció antes de empezar.

**Nueve escenarios llegaron en verde sin código adicional** al que ya pedían E2 y E10: E1 es una
propiedad de la plantilla que ya existía (se deja como test para que quede fijada, porque todo el
sistema depende de ella); E3-E5 y E7-E9 los garantiza el reparto por rol y la tabla de puntos que
E2 obligó a escribir; E14 y E15 funcionan porque `guardarFormacionDefensa` ya era genérico y
porque la spec 028 arregló la persistencia de las celdas.

**Una corrección salió de mirar el dibujo, no de los tests.** Con la suite en verde se generó un
mapa ASCII temporal de las cuatro vías: contra la pipe, el punto del receptor de zona 6 estaba
basculado a la izquierda (x = 4,0) como pide el documento, pero su zona de responsabilidad
quedaba centrada ligeramente a la derecha. Se corrigió la zona (columnas 6-10 en vez de 7-11), y
ahora solapa una columna con el líbero justo donde el sistema anticipa el remate. Ningún test lo
habría cazado: los escenarios comprueban que la zona existe y está dentro del campo, no que
apunte al mismo sitio que el jugador. Vale la pena recordarlo — la geometría de este proyecto
necesita mirarse dibujada además de aseverarse.

**Una frase de la spec se corrigió antes de escribir código** (no durante): E5 decía que el
central está "en la zona 3", cuando el propio documento le exige desplazarse al lado del ataque
para cerrar el doble bloqueo. Se reescribió a "junto a la red", que es lo que de verdad se
cumple siempre.

**Se investigó posicionamiento defensivo real** (defensa perimetral: los tres zagueros sobre las
líneas, el off-blocker descolgado a los 3 metros, el central-fondo sobre la línea de fondo) para
fijar las distancias. Las fuentes coinciden en los principios pero no dan medidas canónicas en
metros — no existen: son criterio del entrenador. Los números concretos de esta spec son una
lectura razonable de esos principios aplicados al documento del equipo, revisable con el
entrenador delante.

**Ningún cambio en `application/` ni en `ui/`:** el store y `Tablero` ya trataban cualquier
sistema de defensa de forma genérica desde la spec 021. `docs/dominio.md` no se tocó: el sistema
usa las reglas que ya estaban escritas (en defensa no hay validación de posición, la rejilla solo
existe en defensa), no añade ninguna.
