# 060 — El veredicto del examen, solo al final

**Estado:** Completada
**Paso de la hoja de ruta:** 4

## Problema

En el examen guiado, cuando el alumno valida una rotación, el sistema le enseña ahí mismo si
ha cometido una falta de posición: le marca la ficha en rojo, le nombra a los jugadores
implicados y le pinta un punto de aviso en la pestaña de esa rotación. Como todavía le quedan
rotaciones por colocar, puede volver, corregir y revalidar hasta que no salte nada. El examen
deja de medir lo que el alumno sabe y pasa a medir lo que consigue por prueba y error.

Un examen no corrige pregunta a pregunta: entrega el boletín al final. Ver el fallo solo al
terminar obliga a comprometerse con cada colocación.

## Objetivo

Durante todo el examen —colocando y también después de validar una rotación— no hay ninguna
señal de que exista una falta de posición. Las faltas, con sus jugadores implicados, aparecen
por primera vez en el boletín, cuando el examen entero ha terminado.

## Contexto: qué cambia respecto a la spec 057

Esta spec **revisa el escenario E7 de la 057** ("Al validar una rotación se ven sus faltas como
en la ventana de Edición"). E7 se escribió a conciencia: E6 decía "colocando no ves nada", E7
decía "validando sí". Esta spec mueve esa línea: **validando tampoco**.

Lo que **no** cambia de la 057:

- La nota de una rotación con falta sigue siendo 0 (057-E8). Es una regla de cálculo del
  dominio (`corregirRotacion`), no de presentación, y se queda como está.
- El boletín final sigue mostrando, por rotación, su nota y si tuvo falta (057-E11), y la
  comparación con el modelo (057-E12), y el motivo de no-insignia (057-E13).
- Validar una rotación sigue siendo lo que habilita "Ver mi boletín" cuando están todas
  (057-E11). El examen por sistema sigue sin validar rotación a rotación (013-E11).
- La nota por cercanía (057-E9/E10) tampoco se enseña rotación a rotación hoy, y sigue igual.

## Fuera de alcance

- **Cambiar el flujo de validación.** Sigue existiendo el botón "Validar rotación", sigue
  registrando que esa rotación queda hecha, y sigue habilitando el boletín al completarse
  todas. Lo único que se le quita es enseñar el veredicto.
- **Quitar "Repetir esta rotación".** Tras validar se puede seguir repitiendo una rotación:
  "no lo tengo claro, la rehago" es una decisión legítima del alumno aunque no vea el fallo.
- **La ventana de Edición.** Ahí las faltas se siguen viendo al instante; eso es una
  herramienta de construcción, no un examen.
- **El examen por sistema.** Ya no mostraba faltas rotación a rotación (013-E11): esta spec no
  le añade nada.
- El texto exacto de los botones y el aviso de "rotación hecha" — es UI, no comportamiento.

## Escenarios

**E1 — Al validar una rotación con falta no se ve ninguna señal de falta**
- Dado: un examen en curso, una rotación con las fichas colocadas de forma que producen una
  falta de posición imputable al alumno
- Cuando: se valida esa rotación
- Entonces: no aparece el aviso con los jugadores implicados, ninguna ficha se tiñe de falta, y
  la pestaña de esa rotación no muestra marca de falta — igual que antes de validar

**E2 — Al validar una rotación sin falta el estado visible es el mismo que al validar una con falta**
- Dado: dos exámenes en curso, uno con una rotación en regla y otro con una rotación con falta,
  ambas con todas las fichas colocadas
- Cuando: se valida la rotación en cada uno
- Entonces: lo que ve el alumno es indistinguible entre los dos casos — "rotación hecha" y nada
  más; la falta no se filtra por ausencia de "todo correcto"

**E3 — Volver a una rotación ya validada sigue sin mostrar su veredicto**
- Dado: un examen en curso con una rotación con falta ya validada
- Cuando: se navega a otra rotación y se vuelve a la primera
- Entonces: se sigue viendo colocada y validada, sin veredicto — no aparece la falta "en
  diferido" al volver

**E4 — El boletín final sí muestra las faltas de cada rotación**
- Dado: un examen cuyas rotaciones se han validado todas, alguna con falta
- Cuando: termina el examen y se ve el boletín
- Entonces: cada rotación con falta se marca como tal en su desglose, y al abrir esa rotación
  se ven las fichas en falta y los jugadores implicados — es la primera vez en todo el examen
  que esa información se muestra

**E5 — Una falta descubierta solo al final sigue anulando la nota de esa rotación**
- Dado: un examen con una rotación con falta imputable al alumno, con las fichas a menos de
  medio metro de su sitio, validada sin que se mostrara nada
- Cuando: se calcula la nota final
- Entonces: esa rotación vale 0 y no se concede la insignia — ocultar la falta durante el
  examen no cambia el cálculo, solo cuándo se ve (hereda 057-E8)

**E6 — Cancelar y rehacer el examen no arrastra veredictos del intento anterior**
- Dado: un examen en curso con rotaciones validadas
- Cuando: se reinicia el examen
- Entonces: el nuevo intento empieza sin ninguna corrección previa (ya lo cubre la 057, se
  reafirma aquí porque el mapa de correcciones cambia de significado)

## Preguntas abiertas

Ninguna. Resueltas con el usuario antes de congelar:

- **Al validar, el alumno ve "Rotación registrada".** Se cambia el texto actual ("Rotación
  validada. Elige otra pestaña para continuar"): "validada" se lee como "correcta", que es lo
  que esta spec quiere evitar. Es texto de UI, sin efecto en el comportamiento.
- **Sí se puede repetir una rotación ya validada a ciegas.** El botón "Repetir esta rotación"
  se queda: "no lo tengo claro, la rehago" es decisión del alumno aunque no vea el fallo.
- **La pestaña de rotación mantiene la distinción "colocada" vs "validada".** Solo desaparece
  el marcador de falta. El alumno sigue viendo de un vistazo qué rotaciones ha terminado.

## Al cerrar

Los 6 escenarios pasan. Suite completa: 475 tests (frente a 469 antes de empezar; se
reescribieron además 2 tests de la 057). `npm run typecheck` limpio, `ng build` sin errores
(persiste el aviso de presupuesto de `examen-tablero.css`, ya presente antes y menor que el de
`tablero.css`). No existe `test:coverage`, como ya se hizo constar al cerrar las specs 012,
013 y 057.

**Revisa deliberadamente 057-E7.** El escenario decía "al validar una rotación se ven sus
faltas como en Edición". Sigue existiendo el paso de validar, pero ya no muestra veredicto: el
test `057-E7` de `examen.store.spec.ts` se renombró a `057-E7 / 060-E1` con la aserción
invertida (`correccionRotacionActiva()` es `null` durante el examen, y solo tras
`terminarExamen()` devuelve la nota). El test de dominio de E7 en `examen.spec.ts` no se tocó:
`corregirRotacion` sigue calculando nota y faltas igual — lo que cambió es cuándo la capa de
aplicación las expone. No se editó la spec 057 (está Completada); esta spec la revisa desde
fuera, que es el cauce correcto.

**Desviación real, no anticipada:** la falta se filtraba por **tres** vías en el examen en
curso, no una. `correccionRotacionActiva` alimentaba el panel de aviso y el tinte de fichas
(esperado). Pero las pestañas de rotación leían `correccionesPorRotacion` en crudo para pintar
el punto rojo, sin pasar por ese computed. Se resolvió añadiendo `rotacionesConFaltaVisible` al
store como única puerta ("¿enseño la falta de Rn?") y haciendo que tanto las pestañas como los
chips del boletín pregunten por ahí. Además, `rotacionValidada` (UI) dependía de
`correccionRotacionActiva !== null`, que al ocultarse el veredicto pasaba a ser siempre `false`
y rompía el flujo de "rotación ya hecha" en curso; se separó en `rotacionRegistrada` (store),
que solo mira si la rotación está en el mapa.

**Nada estructural.** `examen.ts` (dominio) no se tocó. `examen.store.ts` gana tres computed
derivados (`rotacionRegistrada`, `rotacionesConFaltaVisible`, y la condición de fase en
`correccionRotacionActiva`) sin cambiar ninguna firma ni el almacenamiento: `confirmarRotacion`
sigue guardando la corrección completa en `correccionesPorRotacion` igual que antes. No cambia
qué capas existen ni qué hace la aplicación en producción más allá de esta pantalla, así que
`arquitectura.md` y `README.md` no necesitan tocarse (ADR 0027).

**`docs/dominio.md` no cambia:** la regla de falta posicional (§5) y su efecto en la nota
(§ "una falta anula la rotación") son correctos y siguen igual. Esta spec es de presentación,
no de reglamento.
