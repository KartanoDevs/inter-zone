# 012 — Examinarse de un sistema de recepción

**Estado:** Completada
**Paso de la hoja de ruta:** 4

## Problema

Un jugador puede mirar un sistema validado en Teoría (spec 052), pero no hay forma de comprobar
si de verdad sabe colocarse: la ventana "Examen" existe en el menú pero no hace nada.

## Objetivo

Sobre un sistema de recepción validado se puede plantear un examen en tres niveles de dificultad
— por puesto, por línea o por sistema completo — y, en cada rotación, saber si la colocación del
alumno respeta las reglas de posición.

## Fuera de alcance

- **La nota de 0 a 10** — spec 013. Esta spec solo dice qué le toca colocar al alumno en cada
  rotación y si lo que coloca es legal.
- **Las insignias** — spec 013.
- Guardar el examen o su resultado, y todo lo que dependa de guardarlo (histórico, comparación
  entre intentos) — spec futura, sin numerar todavía.
- **Nada de `ui/` ni de `application/`.** El tablero de examen, el arrastre, el banquillo y el
  requisito de que el alumno no vea las faltas hasta pulsar «Confirmar» son trabajo de UI aparte,
  sin spec propia porque no cambian ninguna regla del dominio — mismo criterio que la spec 052
  con Teoría.
- **Sistemas de defensa.** Defensa no tiene rotaciones (va por caso del colocador rival ×
  situación × número de bloqueadores) y `docs/dominio.md` dice explícitamente que en defensa no
  existe validación de posición. Un examen de defensa es un modelo distinto, para otra spec.
- **Examinar al líbero como sujeto.** El líbero no tiene plaza en el orden de saque, así que no
  se le puede "examinar de su puesto". Quien juega de líbero se examina del titular al que
  sustituye.
- Añadir un cuarto tipo de examen. El diseño deja un único punto de extensión para cuando haga
  falta, pero esta spec entrega los tres que pide el encargo.

## Escenarios

### Qué le toca colocar al alumno, según el tipo de examen

**E1 — En el examen por puesto, al alumno le vienen dados los otros cinco y solo coloca el suyo**
- Dado: un sistema de recepción validado y un titular a examinar
- Cuando: se plantea un examen por puesto sobre ese titular, para una rotación concreta
- Entonces: se le dan colocados los otros cinco jugadores de esa rotación, y solo tiene que
  colocar al titular examinado

**E2 — En el examen por línea, le vienen dados los tres de la línea contraria y coloca los tres
de la suya**
- Dado: un sistema de recepción validado y un titular a examinar
- Cuando: se plantea un examen por línea sobre ese titular, para una rotación en la que ocupa la
  línea delantera
- Entonces: se le dan colocados los tres jugadores de la línea zaguera, y tiene que colocar a los
  tres de la línea delantera, incluido él mismo

**E3 — En el examen por sistema, coloca a los seis en cada una de las seis rotaciones**
- Dado: un sistema de recepción validado
- Cuando: se plantea un examen por sistema
- Entonces: en cada una de las seis rotaciones no se le da colocado a nadie, y tiene que colocar
  a los seis

**E4 — Al examinado le cambia la línea con la rotación, y el examen por línea le pide un trío
distinto en cada una**
- Dado: un sistema de recepción validado y un titular a examinar con el examen por línea
- Cuando: se recorren las seis rotaciones
- Entonces: en las rotaciones donde el titular ocupa la línea delantera se le pide el trío
  delantero, y en las que ocupa la zaguera se le pide el trío zaguero — no siempre el mismo

**E5 — En las rotaciones en que el líbero entra por el examinado, la ficha que hay que colocar
es la del líbero** *(revertido por la spec 057-E3: ver nota)*
- Dado: un sistema de recepción validado, con líbero, y un titular a examinar que en alguna
  rotación es sustituido por el líbero
- Cuando: se plantea un examen por puesto o por línea sobre ese titular, para esa rotación
- Entonces: la ficha que se pide colocar es la del líbero, no la del titular — porque es el
  líbero quien juega esa rotación de verdad

  > **Nota (spec 057):** este escenario ya no describe el comportamiento actual. La 057 lo
  > revierte a propósito: cuando el líbero sustituye al examinado, esa rotación **no se
  > examina** — antes convertía en silencio el examen de un central en el examen del líbero, sin
  > que el alumno lo supiera. Se deja el texto original sin reescribir, como constancia de la
  > decisión que cambió.

### Cuándo un sistema se puede examinar

**E6 — No se puede examinar un sistema al que le falta alguna rotación por colocar**
- Dado: un sistema de recepción validado con menos de seis formaciones guardadas
- Cuando: se intenta plantear cualquier tipo de examen sobre él
- Entonces: se rechaza

**E7 — No se puede examinar un sistema cuyo modelo tenga una falta guardada a propósito**
- Dado: un sistema de recepción validado con las seis formaciones guardadas, una de ellas con una
  falta de posición guardada con la validación desactivada (spec 017)
- Cuando: se intenta plantear cualquier tipo de examen sobre él
- Entonces: se rechaza — no tiene sentido medir al alumno contra un modelo que no cumple sus
  propias reglas

### De quién es una falta de posición durante el examen

**E8 — Cruzarse con un compañero de su propia línea es falta suya**
- Dado: un examen por línea, con el alumno colocando a los tres de su línea
- Cuando: dos de sus fichas quedan en orden lateral invertido
- Entonces: la falta se le imputa al alumno

**E9 — Cruzarse con un compañero que venía dado también es falta suya**
- Dado: un examen por puesto, con el alumno colocando solo su ficha
- Cuando: su ficha queda en una posición que produce una falta de profundidad u orden lateral con
  una de las fichas que venían dadas
- Entonces: la falta se le imputa al alumno — la ficha dada está en el punto que el entrenador
  validó, así que la única variable es dónde soltó él la suya

**E10 — Una falta entre dos fichas dadas no se le imputa al alumno**
- Dado: un examen por puesto o por línea
- Cuando: la formación completa de esa rotación (dadas + colocadas) tiene una falta en la que
  ninguna de las dos fichas implicadas es de las que le tocaba colocar al alumno
- Entonces: esa falta no se le imputa

## Preguntas abiertas

Ninguna. Resueltas con el usuario antes de escribir esta spec:

- **Alcance de la fase:** solo recepción; defensa queda para después, porque no tiene rotaciones
  ni validación de posición en el dominio.
- **Qué significa "posición a examinar":** un titular concreto del orden de saque, no una P fija.
  Con una P fija el examen por línea pediría siempre el mismo trío en las seis rotaciones.
- **Qué significa "jugadores opuestos" en el examen por línea:** los tres de la línea contraria a
  la del examinado, no una relación de vecindad — el dominio no define adyacencia entre
  posiciones rotacionales y no se ha inventado ninguna para esta spec.
- **Modelo del tipo de examen:** unión cerrada de tres casos con nombre (`'puesto' | 'linea' |
  'sistema'`), no una configuración declarativa. Los tipos se añaden desde código, no desde la
  aplicación, así que no hace falta pagar el coste de un modelo genérico con un validador de
  combinaciones imposibles.

## Al cerrar

Los 10 escenarios pasan (425 tests en `domain/`, frente a los 415 con los que arrancó esta
spec). No existe todavía el script `test:coverage` mencionado en `docs/flujo-de-trabajo.md`, así
que la cobertura de `domain/` no se reportó con una cifra — se dice aquí en vez de inventarla.

**Cambio de diseño durante la implementación, no anticipado en la spec:** `faltasImputables`
(E8-E10) no recibe el `Examen` ni el `Sistema`, como parecía natural al escribir los escenarios,
sino el subconjunto de jugadores ya resuelto (`readonly Jugador[]`) que `jugadoresAColocar` ya
calculó. La primera versión intentaba reconstruir un `Sistema` de mentira dentro de la función
para reutilizar `jugadoresAColocar`, fijando la rotación a `1` — un apaño que ignoraba la
rotación real y rompía el caso del líbero. Separar "quién coloca el alumno" (una llamada previa
del que orquesta el examen) de "qué faltas son suyas" (una función que ya recibe la respuesta)
es más simple y no exige inventar datos falsos.

**Nada se desvió en el resto:** los 10 escenarios se implementaron tal como se escribieron, sin
descubrir ninguna regla de voleibol incorrecta. `docs/dominio.md` no necesitó ningún cambio: la
decisión de no inventar una relación de adyacencia (resuelta antes de congelar la spec, usando
"la línea contraria" en vez de "vecino" u "opuesto") evitó ese riesgo desde el diseño.

**Nada estructural que anotar en `docs/decisiones/`.** El único fichero nuevo es
`src/app/domain/examen.ts`, que no cambia ninguna capa existente ni introduce ningún adaptador o
patrón nuevo — reutiliza `formacionEnRotacion`, `jugadoresEnPista`, `validarFormacion` y
`sistemaCompleto` tal como estaban.
