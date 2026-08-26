# 055 — La ventana de Examen

**Estado:** Congelada
**Paso de la hoja de ruta:** 4

## Problema

Las reglas de examinarse ya existen en el dominio (specs 012-013): los tres tipos de examen, el
veredicto de legalidad y la nota de 0 a 10. Pero la ventana "Examen" sigue siendo el mismo aviso
de "sin funcionalidad todavía" — nadie puede examinarse de verdad porque no hay dónde arrastrar
una ficha ni ver el resultado.

## Objetivo

Cualquier cuenta puede abrir la ventana "Examen", elegir un sistema de recepción validado y un
tipo de examen (por posición, por línea o por sistema completo), colocar las fichas que le
tocan, confirmar, y ver su nota, sus faltas y si ha ganado la insignia del tipo. Si la gana, esa
insignia queda guardada en su cuenta — spec 056, de la que esta spec depende para el escenario
E9.

## Fuera de alcance

- **Colocar sin arrastrar** (alternativa de teclado/lista para el arrastre). Necesaria más
  adelante por accesibilidad, pero no en esta spec.
- **Guardar el intento en sí (las colocaciones) o la nota.** Solo se guarda el hecho de haber
  ganado una insignia (spec 056) — la nota y las faltas se calculan de nuevo cada vez, nunca se
  persisten (mismo criterio que ya rige el veredicto de validación del editor). Cerrar sesión o
  recargar antes de terminar pierde el intento en curso; eso es aceptable.
- **Sistemas de defensa.** El examen solo existe sobre recepción (spec 012).
- **Comparar el resultado entre varios intentos o llevar un histórico de notas.** Solo se ve el
  intento recién confirmado; lo único que sobrevive es la insignia ya ganada (spec 056).
- **Cambiar el nav/cabecera de `Tablero`** más allá de sustituir el aviso "sin funcionalidad" de
  la ventana Examen por el contenido real. La navegación entre Editor/Teoría/Examen/Cuenta no
  cambia.

## Escenarios

### Elegir sistema y tipo de examen

**E1 — Solo aparecen sistemas de recepción que se pueden examinar**
- Dado: un equipo con sistemas de recepción validados, algunos completos y legales y otros
  incompletos o con una falta guardada a propósito
- Cuando: se abre la ventana Examen y se elige ese equipo
- Entonces: solo se puede elegir un sistema entre los que están completos y sin ninguna falta en
  sus seis rotaciones

**E2 — Elegir el examen por posición pide también a quién examinar**
- Dado: un sistema elegido
- Cuando: se elige el examen "por posición" o "por línea"
- Entonces: aparece un segundo selector para elegir el titular a examinar; con "por sistema" no
  aparece, porque coloca a los seis

### Colocar las fichas que tocan

**E3 — En el examen por posición solo se puede arrastrar la ficha del titular examinado**
- Dado: un examen por posición en curso, en una rotación concreta
- Cuando: se mira la pista
- Entonces: los demás jugadores de esa rotación están ya colocados y no se pueden arrastrar; solo
  la ficha del titular examinado se puede traer desde el banquillo y colocar

**E4 — En el examen por línea solo se pueden colocar los tres de la línea del examinado**
- Dado: un examen por línea en curso, en una rotación concreta
- Cuando: se mira la pista
- Entonces: los tres jugadores de la línea contraria están ya colocados y no se pueden mover; los
  tres de la línea del examinado se colocan desde el banquillo

**E5 — En el examen por sistema se colocan los seis en cada rotación**
- Dado: un examen por sistema en curso
- Cuando: se recorren las seis rotaciones
- Entonces: en cada una la pista empieza vacía y los seis se colocan desde el banquillo

**E6 — No se puede pedir corrección de una rotación con fichas sin colocar**
- Dado: un examen por posición o por línea, en una rotación con alguna ficha del alumno todavía
  sin colocar
- Cuando: se intenta confirmar esa rotación
- Entonces: no se puede — el aviso dice cuántas fichas faltan por colocar, no solo que "falta
  algo"

### Confirmar sin ver las faltas antes

**E7 — Mientras se arrastra no se distingue una colocación legal de una que no lo es**
- Dado: un examen en curso, con fichas del alumno colocadas de forma que producirían una falta si
  se corrigieran ahora
- Cuando: se mira la pista antes de confirmar
- Entonces: no hay ninguna señal visual de que exista una falta — todas las fichas del alumno se
  ven igual, coloquen o no una falta real

**E8 — Confirmar pide conformidad y advierte de que ya no se puede volver atrás**
- Dado: un examen en el que se puede pedir corrección (rotación completa en el fácil/medio, o las
  seis en el difícil)
- Cuando: se pulsa "Confirmar"
- Entonces: se pide conformidad explícita antes de corregir, avisando de que no se podrá volver a
  tocar esa colocación

### Ver el resultado

**E9 — Al corregir aparecen la nota, las faltas y si se ha ganado la insignia, y esta última
queda guardada en la cuenta**
- Dado: un examen ya confirmado, con nota y faltas que conceden la insignia de su tipo
- Cuando: se pide su corrección
- Entonces: se ve la nota de 0 a 10, qué rotaciones tuvieron falta, y que se ha ganado la
  insignia — y esa insignia queda guardada en la cuenta del alumno (spec 056), a diferencia de la
  nota y las faltas, que no se guardan

**E9b — Sin nota suficiente o con alguna falta, se explica por qué no hay insignia**
- Dado: un examen ya confirmado cuya nota o cuyas faltas no conceden la insignia
- Cuando: se pide su corrección
- Entonces: se ve la nota y las faltas, y un aviso de qué le falta para la insignia — no
  simplemente su ausencia

**E12 — Repetir un examen ya superado no duplica la insignia**
- Dado: una cuenta que ya ganó la insignia de un tipo, sobre un sistema y (si aplica) un titular
  concretos
- Cuando: repite ese mismo examen y vuelve a superarlo
- Entonces: sigue teniendo esa insignia — no aparecen dos ni se pierde la fecha en que la ganó
  la primera vez

**E10 — El resultado se puede comparar con el sistema real, rotación a rotación**
- Dado: un examen ya corregido
- Cuando: se pide comparar una rotación con el modelo del entrenador
- Entonces: se ve dónde debía estar cada ficha del alumno frente a dónde la colocó, de forma que
  el error se distingue sin depender solo de un color

**E11 — En el examen por posición y por línea se puede pedir la corrección de una rotación
suelta; en el de sistema, solo al completar las seis**
- Dado: un examen de cada uno de los tres tipos
- Cuando: se completa una rotación pero no las seis
- Entonces: el de posición y el de línea permiten pedir su corrección; el de sistema no ofrece
  ninguna corrección hasta que las seis estén colocadas

## Preguntas abiertas

Ninguna. Resueltas con el usuario antes de escribir esta spec:

- El tipo de examen que las specs 012-013 llaman "por puesto" se nombra en la interfaz "por
  posición" — mismo significado (un único titular examinado), solo cambia el nombre visible.
- La comparación visual del resultado (E10) se resuelve con superposición (ficha del modelo en
  contorno discontinuo, unida por una línea al punto real del alumno), no con un simple
  interruptor "antes/después" — así el error se ve como magnitud, no hay que recordar dónde
  estaba antes de comparar.
- Colocar sin arrastrar queda fuera de esta spec a propósito: se implementará como mejora de
  accesibilidad aparte.
- Solo se guarda el logro (la insignia conseguida), nunca la nota ni las colocaciones del
  intento: la nota es derivable y recalculable (si algún día se afina la curva de puntuación, no
  debe quedar un histórico de notas calculadas con una fórmula antigua), la insignia es un hecho.
  El diseño concreto de esa persistencia es la spec 056.

## Al cerrar

Pendiente — se rellena al completar la spec.
