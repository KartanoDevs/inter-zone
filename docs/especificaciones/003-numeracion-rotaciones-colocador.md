# 003 — Numeración de rotaciones anclada al colocador

**Estado:** Completada
**Paso de la hoja de ruta:** 1

## Problema

Cuando un entrenador dice "R3" quiere decir "el colocador está en la zona 3", que es la
convención habitual del sistema 5-1. Hoy la herramienta numera las rotaciones a partir de
cómo se definió el orden de saque, sin mirar dónde está el colocador. Si el orden de saque no
empieza con el colocador en P1, "R3" en boca del entrenador y la "R3" que calcula la
herramienta pueden ser formaciones distintas.

## Objetivo

Que `Rn` signifique siempre "el colocador ocupa la posición rotacional `Pn`", sea cual sea el
orden de saque que definió el entrenador.

## Fuera de alcance

- Cómo se deriva la posición rotacional dentro de una rotación ya identificada. Sigue siendo
  la rotación de array que ya existe; esta spec solo cambia **cómo se numera**, no cómo se
  calcula una vez numerada.
- Añadir UI de selección de rotación. Eso es la spec 008.
- Qué pasa si un orden de saque tiene dos colocadores o ninguno como error de composición de
  plantilla: eso ya lo rechaza `validarPlantilla` (spec 002, E14).

**Sí entra en alcance**, aunque toca una spec ya `Completada`: `validarFormacion` (spec 001)
recibe un número de rotación y hoy lo interpreta como desplazamiento crudo sobre el orden de
saque. Esta spec corrige esa interpretación para que sea la misma en todo el dominio: un
único concepto de "rotación", nunca dos numeraciones que coexistan con el mismo nombre `Rn`.

## Escenarios

**E1 — El colocador ya está en P1**
- Dado: un orden de saque en el que el colocador ocupa P1
- Cuando: se pide la rotación R1
- Entonces: se obtiene el propio orden de saque, sin rotar

**E2 — El colocador está en otra posición del orden de saque**
- Dado: un orden de saque en el que el colocador ocupa P4
- Cuando: se pide la rotación R1
- Entonces: se obtiene una rotación en la que el colocador ocupa P1

**E3 — Pedir una rotación concreta coloca al colocador en esa zona**
- Dado: un orden de saque cualquiera
- Cuando: se pide la rotación R3
- Entonces: la formación resultante tiene al colocador ocupando P3

**E4 — Las seis rotaciones cubren las seis posiciones del colocador sin repetir**
- Dado: un orden de saque cualquiera
- Cuando: se piden las rotaciones R1 a R6
- Entonces: en cada una el colocador ocupa una posición distinta, y las seis posiciones P1..P6
  quedan cubiertas exactamente una vez

**E5 — Rotar seis veces devuelve el orden de partida**
- Dado: un orden de saque cualquiera
- Cuando: se aplican las seis rotaciones en sentido de rotación
- Entonces: la sexta coincide con el orden de saque original (invariante 11 de
  `docs/dominio.md`)

**E6 — Un orden de saque sin colocador es un error**
- Dado: un orden de saque en el que ningún jugador tiene rol `colocador`
- Cuando: se pide cualquier rotación `Rn`
- Entonces: se rechaza

**E7 — Identificar en qué rotación está una formación dada**
- Dado: un orden de saque ya rotado, en el que el colocador ocupa una posición conocida
- Cuando: se pregunta a qué `Rn` corresponde
- Entonces: se obtiene el número de rotación cuyo colocador ocupa esa misma posición

**E8 — `validarFormacion` usa la numeración anclada al colocador**
- Dado: un orden de saque en el que el colocador no ocupa P1, y una formación que se quiere
  validar para la rotación `R3`
- Cuando: se llama a `validarFormacion` pidiendo `R3`
- Entonces: evalúa la formación en la que el colocador ocupa P3 según esta spec, no según el
  desplazamiento crudo que usaba antes de esta spec

## Preguntas abiertas

Ninguna. Resueltas con el usuario:

- Esta spec **corrige** la interpretación de `rotacion` en `validarFormacion` (spec 001).
  Al cerrar esta spec hay que: anotar la desviación en el "Al cerrar" de la spec 001, y añadir
  un fichero nuevo en `docs/decisiones/` que precise la 0005 (append-only, sin editarla).
- La numeración de `Rn` reutiliza el mismo mecanismo de "rotar desde el colocador" que ya usa
  `plantilla.ts::asignarIndices` (decisión 0008), en vez de una derivación independiente.

## Al cerrar

Los 8 escenarios pasan (40 en total en `src/app/domain`). No existe `npm run test:coverage`
en `package.json`; no se reporta cobertura numérica por el mismo motivo que en specs
anteriores.

**Desviación respecto al plan inicial.** El E8 no se quedó dentro de `rotacion.spec.ts`: al
tocar `validarFormacion`, su test se escribió en `validacion.spec.ts`, junto a los escenarios
que ya ejercitan esa función. `rotacion.spec.ts` reúne los escenarios E1–E7, que solo dependen
de `formacionEnRotacion` y `rotacionDe`.

**Cambio deliberado en una spec ya `Completada`.** Como estaba previsto en las "Preguntas
abiertas" ya resueltas, esta spec corrigió el significado del parámetro `rotacion` de
`validarFormacion` (spec 001). Se actualizaron los 15 escenarios existentes de esa spec para
seguir probando las mismas reglas con el valor de `rotacion` correcto bajo la nueva
numeración; se anotó en el "Al cerrar" de la spec 001 y se registró como decisión 0010, que
precisa (no sustituye del todo) la decisión 0005.

**Refactor.** `plantilla.ts::asignarIndices` calculaba su propio desplazamiento desde el
colocador con `rotar(orden, orden.findIndex(...))`. Se sustituyó por
`formacionEnRotacion(orden, 1)`, que hace exactamente ese cálculo: ahora hay un único lugar en
el dominio que sabe "rotar desde el colocador". `plantilla.spec.ts` siguió en verde sin tocar
ningún test, confirmando que era un refactor real y no un cambio de comportamiento.

**Lo que no se desvió:** ninguna regla de `docs/dominio.md` resultó incorrecta; la fórmula de
`rotar()` (desplazamiento de array) no cambió, solo qué desplazamiento se le pide.

**Lo que sorprendió:** los escenarios E2, E3, E4 y E6 pasaron en verde nada más escribir
`formacionEnRotacion`, sin código adicional — la función general ya los cubría desde el primer
escenario. Solo E7 (`rotacionDe`) exigió código nuevo aparte de la función inicial.
