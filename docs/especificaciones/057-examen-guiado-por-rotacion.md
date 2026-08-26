# 057 — Examen guiado por rotación

**Estado:** Completada
**Paso de la hoja de ruta:** 4

## Problema

La ventana Examen ya deja arrastrar fichas y calcular una nota (spec 055, descartada), pero
probarla enseñó tres cosas: la nota es tan exigente que colocar "más o menos en su sitio" ya
suspende, no hay ningún paso previo que pida qué examinar antes de lanzar al alumno a la pista,
y el resultado final es un único número sin decir en qué rotación falló ni cómo debería haber
quedado.

## Objetivo

Al abrir Examen se elige primero qué examinar; al terminar se ve, rotación a rotación, la nota,
las faltas y una comparación con el modelo del entrenador — con una nota que premia colocar
cerca del sitio, no clavarlo al centímetro.

## Fuera de alcance

- **Examinar al líbero como sujeto propio.** Esta spec mantiene la exclusión de la 012 ("quien
  juega de líbero se examina del titular al que sustituye"); revertirla es la spec 058.
- Colocar sin arrastrar (accesibilidad, aparte).
- Guardar el intento en sí — las colocaciones no se persisten, solo el logro de la insignia
  (spec 056), igual que ya establecía la 055.
- Sistemas de defensa.
- Comparar el resultado entre varios intentos o llevar un histórico de notas.
- Cambiar el nav o la cabecera de `Tablero` más allá del contenido propio de la ventana Examen.

## Escenarios

### Antes de empezar

**E1 — Al abrir Examen se pregunta la configuración antes de nada**
- Dado: se abre la ventana Examen
- Cuando: todavía no se ha elegido equipo, sistema, tipo de examen y (si el tipo lo pide)
  titular
- Entonces: no aparece ninguna pista ni ninguna ficha — solo la elección pendiente

**E2 — Con la configuración completa se pide conformidad para empezar**
- Dado: equipo, sistema, tipo y titular ya elegidos
- Cuando: se confirma la configuración
- Entonces: se pide conformidad explícita, avisando de que no se podrá volver a esta pantalla, y
  solo entonces arranca el examen

### Qué rotaciones se examinan

**E3 — Una rotación donde el titular examinado no está en pista no se examina**
- Dado: un examen por posición o por línea de un titular al que el líbero sustituye en algunas
  rotaciones (spec 043)
- Cuando: se recorre el examen
- Entonces: esas rotaciones no se ofrecen para examinar — ni se piden fichas, ni cuentan para la
  nota

**E4 — Un titular en pista las seis rotaciones se examina de las seis**
- Dado: un titular al que el líbero nunca sustituye en el sistema elegido
- Cuando: se recorre el examen
- Entonces: las seis rotaciones se examinan con normalidad — E3 es la excepción, no la regla

**E5 — La nota final es la media de las rotaciones examinadas, no de las seis**
- Dado: un examen por posición de un titular que solo está en pista en tres rotaciones (E3)
- Cuando: se calcula la nota final
- Entonces: es la media de esas tres — las otras tres no cuentan como cero ni se promedian

### Colocar sin ver el veredicto

**E6 — Mientras se colocan las fichas no hay ninguna señal de falta**
- Dado: un examen en curso con fichas del alumno colocadas de forma que producirían una falta
  si se corrigieran ahora
- Cuando: se mira la pista antes de validar esa rotación
- Entonces: no hay ninguna señal visual de que exista una falta — todas las fichas del alumno se
  ven igual, coloquen o no una falta real

### Validar una rotación

**E7 — Al validar una rotación se ven sus faltas como en la ventana de Edición**
- Dado: una rotación con una falta de posición cometida por el alumno
- Cuando: se valida esa rotación
- Entonces: se ve qué jugadores la cometen, con el mismo aviso que usa Edición — no basta con
  decir que "hay una falta"

**E8 — Una rotación con falta vale cero aunque las fichas estén cerca de su sitio**
- Dado: una rotación con una falta de posición imputable al alumno, con sus fichas a menos de
  medio metro de donde debían estar
- Cuando: se calcula la nota de esa rotación
- Entonces: es 0 — la falta corta la nota antes de mirar ninguna distancia

### La nota por cercanía

**E9 — Una ficha a medio metro o menos de su sitio es un diez**
- Dado: una ficha del alumno a 0,5 m o menos del punto del modelo
- Cuando: se calcula su nota
- Entonces: es 10

**E10 — La nota decae de forma proporcional hasta perderla entera a los cuatro metros**
- Dado: fichas del alumno a distancias crecientes del punto del modelo, entre 0,5 m y 4 m
- Cuando: se calcula la nota de cada una
- Entonces: baja de forma proporcional a la distancia, y a partir de 4 m la nota es 0

### Ver el resultado

**E11 — Al terminar se ve el desglose por rotación, no solo la nota final**
- Dado: un examen ya corregido
- Cuando: se pide el resultado
- Entonces: se ve, para cada rotación examinada, su nota y si tuvo falta — además de la nota
  final y si se ha ganado la insignia

**E12 — El resultado se puede comparar con el modelo, rotación a rotación**
- Dado: un examen ya corregido
- Cuando: se pide comparar una rotación con el sistema del entrenador
- Entonces: se ve dónde debía estar cada ficha del alumno frente a dónde la colocó, de forma que
  el error se distingue sin depender solo de un color

**E13 — Sin insignia se explica qué faltó**
- Dado: un examen cuya nota o cuyas faltas no conceden la insignia
- Cuando: se pide su corrección
- Entonces: se ve la nota, las faltas, y un aviso de qué le faltó para la insignia — no
  simplemente su ausencia

**E14 — Superar el examen de un titular da su insignia; superar el de otro da otra distinta**
- Dado: una cuenta que supera el examen de Central 1 y, en otro intento, el de Central 2
- Cuando: se consultan sus insignias
- Entonces: tiene las dos, cada una asociada a su titular — ninguna sustituye a la otra

## Preguntas abiertas

Ninguna. Resueltas con el usuario antes de escribir esta spec:

- **Radios de la curva de nota: 0,5 m para el diez, 4 m para el cero** (sustituyen a los 0,45 m
  y 3 m de la spec 013). La curva anterior medía precisión de pizarra, no criterio táctico: a
  metro y medio de su sitio —"más o menos ahí" en una pizarra— la nota antigua ya suspendía.
  Esta spec actúa como la "spec de ajuste" que la 013 exigía para tocar esos valores.
- **Una falta de posición sigue anulando la rotación (nota 0) y sigue impidiendo la insignia.**
  La nota se relaja; la regla de faltas no se toca.
- **"Parte del examen" = una rotación.** No hay una unidad intermedia entre ficha y examen
  completo.
- **Una rotación no examinable no cuenta como cero.** La nota final se calcula solo sobre las
  rotaciones que sí se examinaron (E3, E5).
- **Cada titular tiene su propia insignia**, ya lo permite el mecanismo existente de la spec 056
  (la insignia se guarda por sistema, tipo y titular).

## Al cerrar

Los 14 escenarios pasan. Suite completa: 458 tests (frente a 453 antes de empezar), `npm run
typecheck` limpio, `ng build` sin errores. No existe `test:coverage`, como ya se hizo constar al
cerrar las specs 012 y 013.

**Revierte deliberadamente 012-E5.** Al escribir el test en rojo de E3 se descubrió que
`jugadoresAColocar` (012-E5) devolvía la ficha del líbero cuando sustituía al examinado, en vez
de excluir la rotación. Esa era precisamente la conducta que esta spec quería cambiar (el
"examen de un central se convertía en examen del líbero"), así que el test 012-E5 se relabeled a
057-E3 con la aserción invertida (`toEqual([])` en vez de `toEqual([jugador('libero', ...)])`).
No es una desviación imprevista: es exactamente el comportamiento que motivó la spec.

**Desviación real, no anticipada al escribir la spec:** el examen "por sistema" (`tipo ===
'sistema'`) nunca llama a `confirmarRotacion()` — por diseño de 012-E11/013-E11, no ofrece
corrección hasta completar las seis. La primera versión de la pantalla de examen en curso ofrecía
igualmente el botón "Validar rotación" para los tres tipos, lo que habría mostrado faltas rotación
a rotación también en el examen por sistema, contradiciendo esa regla ya cerrada. Se corrigió
separando el bloque de acciones en dos ramas según `permiteCorregirRotacionSuelta()` antes de
cerrar la spec — no llegó a esta versión de "Al cerrar" sin corregir.

**Otra desviación de UI, detectada en revisión antes de cerrar:** el botón "Vaciar" se deshabilitó
en un primer borrador justo cuando la rotación estaba validada — el único momento en que hace
falta para poder repetirla tras ver una falta. Se corrigió a "Vaciar/Repetir esta rotación",
siempre disponible.

**Nada estructural que anotar aparte de la decisión 0040** (ya registrada antes de escribir código,
no una sorpresa de implementación). `domain/examen.ts` crece sin reescribirse: `jugadoresAColocar`
gana una comprobación, y se añade `rotacionesExaminables` como función nueva — ningún cambio de
firma en `corregirRotacion`, `corregirExamen` ni `sePuedeExaminar`.

**Ajuste de arquitectura no anticipado, pero dentro de las reglas:** `Pista` (compartida por
Editor, Teoría y Examen) gana un input opcional `fichasComparadas` para la superposición del
modelo (E12). Es opcional con valor por defecto `[]`, así que Editor y Teoría no cambian de
comportamiento ni lo declaran nunca.

Fase 6 (retirar el selector de sustituto del líbero) se hizo junto con esta spec por venir de la
misma decisión 0040, aunque no es, en sí, un escenario de la 057.
