# 066 — El examen guía hasta el final

**Estado:** Congelada
**Paso de la hoja de ruta:** 4

## Problema

En el examen guiado por rotación, tras validar una rotación el alumno se queda mirando el
mismo tablero sin saber qué hacer: la pestaña validada no cambia de aspecto, y hay que leer un
texto pequeño ("Rotación registrada. Elige otra pestaña para continuar.") para entender que
toca cambiar de pestaña a mano. Al validar la última no pasa nada especial: hay que buscar el
botón "Ver mi boletín", que además entrega el examen sin preguntar — a diferencia del inicio,
que sí pide confirmación. Y si el alumno intenta salir de un examen ya terminado, el mensaje le
dice que "perderá lo que lleva hecho", que en ese punto es falso: lo que pierde es poder ver el
boletín.

## Objetivo

Al validar una rotación, su pestaña se marca como hecha y el examen salta a la siguiente sin
validar. Al validar la última, se abre un diálogo de "¿Entregar examen?". El mensaje de salir
de un examen ya terminado dice lo que de verdad se pierde.

## Fuera de alcance

- **Enseñar el veredicto antes de terminar.** La marca de "hecha" es neutra: no dice si la
  rotación estaba bien o mal (spec 060). Ni color de acierto, ni de falta, ni nota.
- **Cambiar qué rotaciones se examinan** ni el orden (spec 057). El salto va a la siguiente
  rotación examinable que quede sin validar, en el orden que ya usa el selector.
- **El examen por sistema.** No valida rotación a rotación (013-E11); esta spec no le añade
  salto ni marca. Su botón "Ver mi boletín" tampoco gana el diálogo de confirmación — se
  entrega al completar las seis, sin paso intermedio, como hasta ahora.
- **Quitar "Repetir esta rotación"** ni "Reiniciar examen". Siguen igual.
- **El diálogo de "¿Empezamos?"** al arrancar. Ya existe y no cambia.

## Escenarios

**E1 — Validar una rotación marca su pestaña como hecha**
- Dado: un examen guiado en curso, con la rotación activa completa
- Cuando: se valida
- Entonces: la pestaña de esa rotación queda marcada como hecha, con una marca neutra que no
  indica acierto ni falta

**E2 — Validar una rotación salta a la siguiente sin validar**
- Dado: un examen con las rotaciones R1 y R2 examinables, R1 activa y completa
- Cuando: se valida R1
- Entonces: la rotación activa pasa a ser R2

**E3 — Al validar la última rotación se abre el diálogo de entregar**
- Dado: un examen con una sola rotación por validar, activa y completa
- Cuando: se valida
- Entonces: se abre el diálogo "¿Entregar examen?" — no se entrega todavía

**E4 — Confirmar el diálogo entrega el examen**
- Dado: el diálogo "¿Entregar examen?" abierto
- Cuando: se confirma
- Entonces: se corrige el examen y se muestra el boletín

**E5 — Cancelar el diálogo deja el examen como estaba, con todas las rotaciones validadas**
- Dado: el diálogo "¿Entregar examen?" abierto
- Cuando: se cancela
- Entonces: el diálogo se cierra, el examen sigue en curso con todas sus rotaciones ya
  validadas, y sigue disponible "Ver mi boletín" para entregar cuando el alumno quiera

**E6 — El salto no ocurre si la rotación validada no era la última pero sí la única sin validar
en su tramo**
- Dado: un examen con R1, R3 y R5 examinables (por puesto), R1 y R5 ya validadas, R3 activa y
  completa
- Cuando: se valida R3
- Entonces: como no queda ninguna sin validar, se abre el diálogo de entregar

**E7 — Repetir una rotación ya validada le quita la marca de hecha**
- Dado: una rotación validada, con su pestaña marcada como hecha
- Cuando: se pulsa "Repetir esta rotación"
- Entonces: la pestaña deja de estar marcada como hecha y vuelve a pedir "Validar rotación"

**E8 — Salir de un examen ya terminado avisa de que no se verá el boletín**
- Dado: un examen terminado, con el boletín a la vista
- Cuando: se intenta cambiar a otra ventana
- Entonces: el aviso dice que al salir no se podrá volver a ver el resultado — no que "se
  perderá lo que lleva hecho"

**E9 — Salir de un examen en curso mantiene el aviso de siempre**
- Dado: un examen en curso, sin terminar
- Cuando: se intenta cambiar de ventana
- Entonces: el aviso sigue diciendo que se cancelará el examen y se perderá lo hecho

## Preguntas abiertas

Ninguna. Resueltas con el usuario antes de congelar:

- **La marca de validada es neutra**, sin color de nota — respeta la spec 060, que está
  Completada.
- **Se crea el diálogo "¿Entregar examen?"**, simétrico con "¿Empezamos?". El botón "Ver mi
  boletín" se mantiene para quien cancele el diálogo.

## Al cerrar

Los 9 escenarios se cumplen. Suite: 515 → 517 — nuevos en `application/examen.store.spec.ts`
(E2, y E3/E6 juntos: el salto y la ausencia de salto al validar la última). E1, E4, E5, E7, E8 y
E9 son interacción y render, verificados con `npm run build` y revisión, mismo criterio que las
specs de UI sin `*.spec.ts` de componente. `npm run typecheck`, `npm run build` y
`npm run format:check` limpios.

**El salto vive en `ExamenStore.confirmarRotacion`**, no en el componente: tras registrar la
corrección, busca la siguiente rotación examinable que no esté en `correccionesPorRotacion` y
salta a ella. Si no hay ninguna, deja la activa donde está y es el componente
(`ExamenTablero.validarRotacion`) quien abre el diálogo mirando `todasLasExaminablesValidadas()`.
La decisión "¿abrir el diálogo?" quedó en el componente porque es UI; el "¿a qué rotación voy?"
en el store porque es estado.

**`EstadoRotacion` ganó `validada?: boolean`**, aparte de `tieneFalta`. `SelectorRotacion` pinta
un check gris (`--text-secondary`, sin color de nota) cuando `validada && !tieneFalta`. Durante
el examen `tieneFalta` es siempre `false` (spec 060), así que se ve el check; en el boletín, si
la rotación tuvo falta, gana el punto rosa de siempre.

**Diálogo "¿Entregar examen?" nuevo**, con el mismo `DialogoConfirmacion` que "¿Empezamos?" y
"Reiniciar examen". Se abre solo al validar la última rotación sin validar; "Ver mi boletín"
sigue en su sitio para quien lo cancele (E5). El examen por sistema no lo usa: entrega directo al
completar las seis, como antes.

**El mensaje de salir del examen se parte en dos según `examen.fase()`**: en `'terminado'` dice
que el boletín no se guarda y no se podrá volver a ver; en `'en-curso'`, el de siempre.

**Sin ADR nuevo ni cambio en `docs/dominio.md`:** es flujo de interfaz del examen, no una regla
de voleibol. Sí se toca `docs/arquitectura.md` (ADR 0027): el salto de `confirmarRotacion` y
`EstadoRotacion.validada`.

**No contradice la spec 060:** la marca de "validada" es neutra por diseño y se comprobó que
`rotacionesConFaltaVisible` sigue siendo la única puerta del veredicto. La 060 sigue Completada
sin tocar.
