# 043 — Cambiar a quién sustituye el líbero no rompe la formación

**Estado:** Completada
**Paso de la hoja de ruta:** 3 (corrección de la spec 017, descubierta al usar la pizarra en la
práctica)

## Problema

Hoy, cambiar "líbero sustituye a" desde ajustes con un sistema ya creado siempre falla: aparece
el modal "No se pudo guardar" y el valor vuelve atrás. No es un bloqueo a propósito — no hay
ningún `disabled` en el selector. Lo que pasa es que `cambiarSustitutoLibero`
(`domain/catalogo-sistemas.ts`) purga de la formación guardada al jugador que deja de estar en
pista, sin meter a quien entra en su lugar, y la formación se queda en 5 de 6. El servidor
rechaza esa formación (`RosterInvalido`, spec 033-E5) porque el **invariante 2** de
`docs/dominio.md` exige que cada formación coloque exactamente a seis. La propia spec 017, en su
escenario E8, dio por buena esa purga sin darse cuenta de que dejaba la formación incompleta —
contradice un invariante que ya existía cuando se escribió.

## Objetivo

Cambiar el sustituto del líbero en una rotación nunca deja una formación con menos de seis:
quien entra ocupa el punto exacto de quien sale. El entrenador no pierde la colocación que había
hecho, y el servidor deja de rechazar el cambio.

## Fuera de alcance

- Ampliar las opciones del selector a los seis titulares (hoy solo ofrece los tres zagueros de la
  rotación activa). Es una limitación real, más estrecha que la regla FIVB 19.3.1.1, pero es un
  cambio de `ui/` aparte y no lo que rompe el guardado.
- Cualquier cambio en `SITUACIONES_POR_CASO`, en defensa, o en cómo se calculan las etiquetas.
  Los sistemas de defensa no tienen jugadores (`PuestoDefensa`, ADR 0029): este ajuste no existe
  ahí y sigue sin existir.
- Tocar el mecanismo por el que `formacionRotacion` puede no existir todavía (rotación sin
  guardar). Ese camino ya funciona: no hay nada que purgar ni que heredar.

## Escenarios

**E1 — Cambiar el sustituto mantiene los seis colocados**
- Dado: un sistema con formación guardada en una rotación donde el líbero está en pista,
  sustituyendo a un titular concreto
- Cuando: se cambia el sustituto de esa rotación a otro titular que también es zaguero en ella
- Entonces: la formación resultante de esa rotación sigue teniendo seis colocaciones — el titular
  antiguo vuelve a la lista y el nuevo sustituido sale, sustituido por el líbero

**E2 — Quien entra hereda el punto exacto de quien sale**
- Dado: la misma situación de E1, con el líbero colocado en un punto concreto
- Cuando: se cambia el sustituto a otro titular zaguero
- Entonces: el titular que vuelve a jugar (el antiguo sustituido) aparece en el punto donde
  estaba colocado antes de que entrara el líbero; el líbero aparece en el punto de quien acaba de
  salir

**E3 — Cambiar a "ninguno" devuelve a los seis titulares, cada uno en su sitio**
- Dado: una rotación donde el líbero está en pista por defecto
- Cuando: se cambia el sustituto de esa rotación a `null`
- Entonces: el líbero sale de la formación y el titular al que sustituía vuelve, en el punto
  donde estaba colocado el líbero

**E4 — Elegir un titular que en esa rotación es delantero no mueve a nadie de más**
- Dado: una rotación donde el líbero está en pista sustituyendo a un titular zaguero
- Cuando: se cambia el sustituto a otro titular que en esa rotación ocupa la línea delantera
  (P2, P3 o P4)
- Entonces: el líbero sale (nadie sustituye desde la línea delantera) y **los dos** titulares
  implicados —el que vuelve y el que ya jugaba de delantero— quedan cada uno en su propio punto,
  sin heredar nada entre ellos

**E5 — Las demás rotaciones no se tocan**
- Dado: un sistema con formaciones guardadas en varias rotaciones
- Cuando: se cambia el sustituto de una única rotación
- Entonces: las formaciones de las demás rotaciones quedan exactamente iguales, punto por punto

**E6 — Sin formación guardada todavía, no hay nada que heredar**
- Dado: una rotación sin formación guardada
- Cuando: se cambia su sustituto
- Entonces: solo cambia la plantilla; sigue sin haber formación para esa rotación (comportamiento
  ya existente, sin cambios)

## Preguntas abiertas

Ninguna. El único punto a decidir —qué hacía con `explicacion` y `celdas` del que sale— se
resuelve solo: como el punto se hereda íntegro, el resto de la colocación (`explicacion`,
`celdas` de la spec 022) se hereda con él, porque hablan de "ese sitio de la pizarra", no del
jugador que lo ocupó antes. Si el entrenador había anotado una explicación de enseñanza para esa
posición, sigue teniendo sentido para quien entra a jugarla.

## Al cerrar

Los 6 escenarios pasan. Suite completa: 290 tests al arrancar esta spec (cierre de la 040) → 297
al cerrarla — 6 en `domain/catalogo-sistemas.spec.ts`, 1 en `application/sistema.store.spec.ts`.
`npm run typecheck` limpio.

**Desviación deliberada del ciclo un-escenario-cada-vez**, con precedente explícito en esta misma
sesión de trabajo (spec 040: "la fórmula geométrica se implementó de una vez, no escenario a
escenario"): los seis escenarios comparten exactamente el mismo algoritmo (diferencia de roster
antes/después por posición, sustitución 1:1 conservando el resto de la colocación), así que
fragmentarlo en seis implementaciones parciales habría generado código a medio hacer en los pasos
intermedios — justo lo que el protocolo de esta sesión prohíbe. Los seis tests sí se escribieron
primero y se confirmó su rojo por aserción real (no `ReferenceError`, la función ya existía)
antes de tocar `catalogo-sistemas.ts`.

**Ningún escenario reveló una regla de voleibol incorrecta.** El problema era puramente de
dominio: un invariante de software (invariante 2, "cada formación coloca exactamente a 6
jugadores") que la propia spec 017 pisó sin darse cuenta once specs atrás. No hay nada que
cambiar en `docs/dominio.md`: las reglas de voleibol descritas ahí (FIVB 19.3.1.1, el líbero
entra y sale según la rotación) seguían siendo correctas; lo que fallaba era la mecánica de
"quién ocupa el punto en la pizarra al cambiar el sustituto", que es implementación, no
reglamento.

**Decisión estructural:** `docs/decisiones/0034-cambiar-sustituto-libero-hereda-el-punto.md`
(nueva). La spec 017 quedó corregida in situ en su escenario E8, con una nota explícita que
apunta a esta spec — no se reescribió en silencio, siguiendo la misma regla que ya usó la spec
020 al revertir a la 019.

**Los dos agujeros que taparon el bug, cerrados de forma distinta a la prevista en el plan
inicial.** El plan proponía hacer que `RepositorioFake` (`sistema.store.spec.ts`) validara roster
igual que el servidor real. Se descartó al llegar aquí: ese doble lo comparten más de cincuenta
tests de escenarios no relacionados con el líbero, y convertirlo en estricto arriesgaba romper
fixtures que construyen formaciones parciales a propósito para otras cosas — cambio de alto
riesgo para un beneficio ya cubierto de otra forma. En su lugar: (a) el test de dominio existente
de la spec 017 (`011-E11 revisa firma por rotación, 017-E8`) se queda igual, y los seis nuevos de
`catalogo-sistemas.spec.ts` sí assertan longitud además de pertenencia; (b) se añadió un test de
extremo a extremo en `sistema.store.spec.ts` que construye una formación completa de seis,
cambia el sustituto a través del store real (no del `RepositorioFake` relajado) y comprueba que
la escritura no queda registrada como fallida — cierra el agujero donde de verdad importaba (la
ruta que un usuario real recorre) sin tocar la infraestructura de test compartida por el resto de
la suite.

**Lo que no se desvió:** los seis escenarios se implementaron tal como se habían escrito, sin
ajustes posteriores a su redacción original.
