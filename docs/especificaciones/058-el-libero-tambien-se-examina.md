# 058 — El líbero también se examina

**Estado:** Completada
**Paso de la hoja de ruta:** 4

## Problema

La spec 012 excluyó al líbero como sujeto de examen: "quien juega de líbero se examina del
titular al que sustituye". Eso deja sin cubrir un puesto real de la plantilla — el líbero
también hay que entrenarlo y demostrar que se domina, y hoy no hay forma de pedir un examen
sobre él específicamente.

## Objetivo

El líbero se puede elegir como sujeto de un examen por posición o por línea, igual que
cualquier otro titular, con su propia insignia.

## Fuera de alcance

- **El examen "por sistema" no cambia.** El líbero ya aparece automáticamente cuando le toca
  sustituir a alguien (spec 012-E5); esta spec no toca ese tipo.
- **A quién sustituye el líbero.** Sigue siendo siempre el central que cae en zaga (decisión
  0040); esta spec no reabre esa elección.
- **Todo lo que ya cubre la spec 057** (curva de nota, popups de configuración y confirmación,
  faltas visibles solo al validar, comparación con el modelo) se hereda sin cambios — el examen
  del líbero es un sujeto más dentro de ese mismo flujo, no un flujo distinto.

## Escenarios

**E1 — El líbero aparece como opción en "a quién examinar" cuando el sistema lo tiene declarado**
- Dado: un sistema de recepción con líbero
- Cuando: se elige el examen "por posición" o "por línea"
- Entonces: "Líbero" aparece como una opción más, junto a los seis titulares

**E2 — Un sistema sin líbero no ofrece esa opción**
- Dado: un sistema de recepción sin líbero declarado
- Cuando: se elige el examen "por posición" o "por línea"
- Entonces: "Líbero" no aparece entre las opciones

**E3 — El examen del líbero por posición solo pide su propia ficha, en las rotaciones donde
está en pista**
- Dado: un examen por posición con "Líbero" como sujeto
- Cuando: se recorren las rotaciones
- Entonces: en las que el líbero está en pista (spec 057-E3, aplicado a él en vez de al titular
  que sustituye) se pide solo su ficha; en las que no está en pista, esa rotación no se examina

**E4 — El examen del líbero por línea pide los tres de zaga de esa rotación, con él incluido**
- Dado: un examen por línea con "Líbero" como sujeto, en una rotación donde está en pista
- Cuando: se mira la pista
- Entonces: los tres de la línea zaguera de esa rotación se colocan desde el banquillo,
  incluido el propio líbero — igual que cualquier examen por línea de un titular zaguero

**E5 — Si el líbero nunca entra en pista en el sistema elegido, la opción no se ofrece**
- Dado: un sistema donde ningún central cae en zaga en ninguna rotación (caso degenerado: los
  dos centrales no están separados tres posiciones en el orden de saque, `rotacion.ts`)
- Cuando: se elige el examen "por posición" o "por línea"
- Entonces: "Líbero" no aparece — no tiene sentido examinar un puesto que nunca se ocupa

**E6 — Superar el examen del líbero da su propia insignia**
- Dado: una cuenta que supera el examen del líbero de un sistema
- Cuando: se consultan sus insignias
- Entonces: tiene la insignia del líbero de ese sistema, distinta de la de cualquier central —
  ninguna sustituye a la otra ni se confunde con ella

## Preguntas abiertas

Ninguna. Resueltas con el usuario antes de escribir esta spec:

- **Rotaciones examinadas: donde el líbero está en pista con el sustituto por defecto**
  (decisión 0040) — con esa regla, el líbero suele jugar las seis rotaciones, porque siempre hay
  algún central en zaga en cada una.
- **Ambos tipos, posición y línea**, igual que cualquier titular.
- **Insignia propia**, distinta de la de cualquier central. No hace falta cambiar nada de
  persistencia: el mecanismo de la spec 056 ya guarda la insignia por sistema, tipo y titular, y
  el líbero tiene su propio identificador de jugador como cualquier otro.

## Al cerrar

Los 6 escenarios pasan. Suite completa: 468 tests (frente a 458 al empezar esta spec), `npm run
typecheck` limpio, `ng build` sin errores.

**Ningún cambio de diseño no anticipado.** El plan escrito al congelar la spec preveía
exactamente el punto de extensión que se usó: una rama nueva en `jugadoresAColocar` que localiza
al líbero directamente en `jugadoresEnPista` cuando `titularId` es su propio id, en vez de
resolverlo a través del orden de saque (que nunca lo contiene, ADR 0014). Se extrajo
`jugadoresDesdeIndice` como función interna para no duplicar el cálculo de "puesto" vs. "línea"
entre la rama del líbero y la del titular normal — refactor menor, sin cambiar ningún
comportamiento observable.

**La insignia propia (E6) no necesitó ningún cambio de persistencia**, tal como preveía la spec:
`InsigniasRepository.registrar` ya recibía `titularId: string | null`, y la clave compuesta de la
056 ya distingue por ese campo. Usar el id del líbero como `titularId` bastó.

**Imprevisto real, detectado al escribir el HTML antes de esta spec (en la 057):** el titular
activo se mostraba con su `id` crudo en dos sitios de `examen-tablero` (cabecera del examen en
curso y subtítulo del resultado) en vez de su etiqueta de rol. No era un defecto de la 058, pero
se hizo evidente al comprobar que "Líbero" se vería como `libero` en pantalla en vez de "L" — se
corrigió con un `etiquetaTitularActivo` derivado de `titulares()` + `etiquetaDe(...)`, reutilizado
por ambos sitios.

**Nada estructural que anotar en `docs/decisiones/`.** No hizo falta ninguna decisión nueva: la
058 solo consume la decisión 0040 (ya tomada al cerrar la 057) y el mecanismo de insignias de la
056.
