# 063 — Clonar a uno o a los dos equipos

**Estado:** Completada
**Paso de la hoja de ruta:** No encaja en ninguno: es una utilidad de catálogo, como la spec
026 que la origina.

## Problema

Un entrenador que ha construido un 5-1 de recepción en el equipo masculino y quiere el mismo
punto de partida en el femenino tiene que clonarlo dentro de masculino, cambiar de equipo activo
y no tiene forma de llevárselo: clonar (spec 026) siempre crea la copia en el mismo equipo del
original. La spec 048 resolvió esto para el momento de *crear* un sistema desde cero, pero dejó
"clonar a otro equipo" explícitamente fuera de su alcance.

## Objetivo

El diálogo de clonar ofrece los mismos dos equipos que el de crear (spec 048): se puede marcar
masculino, femenino o los dos, y al confirmar se hace una copia independiente del sistema
completo en cada equipo marcado.

## Fuera de alcance

- **Cambiar el tipo al clonar.** Sigue como en la spec 026: el clon es siempre del mismo tipo
  que el original. El diálogo de clonar no muestra el selector de Tipo (solo el de Equipo).
- **Un sistema compartido entre equipos.** Como en la spec 048: son copias independientes, cada
  una con su id y su `equipoId`, que se editan por separado.
- **Editar el equipo de un sistema ya creado.** Sigue fijo (spec 032). Esto solo afecta al
  momento de clonar.
- **Clonar varios sistemas a la vez**, o a rotaciones/formaciones sueltas. Se clona el sistema
  activo entero, como en la spec 026.
- **El sufijo inteligente en el nombre sugerido.** Al abrir el diálogo se propone siempre
  «‹Nombre original› (copia)», editable, aunque se vaya a clonar a un equipo donde ese nombre
  está libre (pregunta 1, resuelta: se deja fijo, como la spec 026 — es más simple y el
  entrenador edita el campo cuando quiera).
- **Mejorar el reintento tras un fallo de escritura parcial.** Si la escritura falla a mitad de
  un clonado a dos equipos y el entrenador reintenta, el reintento genera ids nuevos para las
  dos copias; si una ya había llegado al servidor, queda una copia de más en ese equipo. Es el
  mismo límite que ya aceptó la spec 048 para `crear`; esta spec lo hereda, no lo resuelve
  (pregunta 3, resuelta).

**Esta spec toca `domain/`, `application/` y `ui/`.** `clonarSistema` pasa a recibir el equipo
de destino (hoy hereda el del original); `SistemaStore.clonar` pasa de `(nombre)` a
`(nombre, equiposId)` — mismo cambio de forma que hizo la spec 048 con `crear`; y el diálogo de
clonar muestra el bloque de Equipo que ya existe para crear. Queda autorizado aquí, igual que en
las specs 026 y 048.

## Escenarios

**E1 — Clonar marcando los dos equipos crea dos copias independientes**
- Dado: un sistema de recepción en el equipo masculino, con sus seis formaciones
- Cuando: se clona con un nombre nuevo y los dos equipos marcados
- Entonces: existe una copia de ese sistema, con contenido idéntico, en el catálogo de masculino
  y otra en el de femenino, cada una con su propio id

**E2 — Clonar marcando solo el equipo del original se comporta como la spec 026**
- Dado: un sistema en masculino
- Cuando: se clona con solo masculino marcado
- Entonces: se crea una única copia, en masculino — mismo resultado que antes de esta spec

**E3 — Clonar marcando solo el otro equipo lleva la copia allí y no deja nada en el de origen**
- Dado: un sistema en masculino
- Cuando: se clona con solo femenino marcado
- Entonces: la copia se crea en femenino, el catálogo de masculino no gana ningún sistema, y el
  equipo activo pasa a femenino con la copia activa

**E4 — El nombre debe estar libre en todos los equipos marcados**
- Dado: un nombre que ya existe, para ese tipo, en uno de los equipos marcados
- Cuando: se intenta clonar con ese nombre
- Entonces: no se crea nada en ningún equipo, ni siquiera en aquel donde el nombre sí estaba
  libre — igual que la spec 048, E3

**E5 — No se puede confirmar sin ningún equipo marcado**
- Dado: el diálogo de clonar
- Cuando: se desmarcan los dos equipos
- Entonces: no se puede confirmar — igual que la spec 048, E5

**E6 — El clon copia todo el contenido del original**
- Dado: un sistema con descripción, explicaciones de rotación y de jugador, y un líbero que
  sustituye a titulares distintos según la rotación (spec 017)
- Cuando: se clona a otro equipo
- Entonces: cada copia conserva descripción, explicaciones y sustituciones del líbero idénticas
  a las del original — no se pierde nada al cruzar de equipo

**E7 — Cada copia es independiente: editar una no toca ni el original ni la otra copia**
- Dado: un sistema clonado a los dos equipos
- Cuando: se modifica y guarda una formación de la copia de femenino
- Entonces: ni el original ni la copia de masculino cambian

**E8 — El diálogo de clonar no muestra el selector de Tipo**
- Dado: el diálogo de clonar abierto
- Cuando: se mira su contenido
- Entonces: hay campo de Nombre y bloque de Equipo (los dos equipos como casillas), pero no
  bloque de Tipo — el clon hereda el tipo del original

**E9 — Al abrir el diálogo de clonar, solo el equipo del original viene marcado**
- Dado: un sistema activo en masculino
- Cuando: se abre el diálogo de clonar
- Entonces: masculino aparece marcado y femenino no — igual que el diálogo de crear parte del
  equipo activo (spec 048)

**E10 — El nombre sugerido sigue siendo «‹Nombre original› (copia)»**
- Dado: un sistema llamado «5-1 básico»
- Cuando: se abre el diálogo de clonar
- Entonces: el nombre propuesto es «5-1 básico (copia)», editable antes de confirmar — igual que
  la spec 026, E7, sin importar a qué equipos se vaya a clonar

**E11 — Con los dos equipos marcados, queda activo el del original**
- Dado: un sistema activo en femenino, que se clona con los dos equipos marcados
- Cuando: se confirma
- Entonces: el equipo activo sigue en femenino y la copia de femenino queda activa en R1; la de
  masculino queda creada y se ve al cambiar de equipo. (La spec 048 dejaba activo "el primero
  del formulario"; aquí manda el equipo que el entrenador ya estaba mirando — pregunta 2,
  resuelta. Solo si el equipo del original no está entre los marcados, E3, se salta al primero
  de los marcados.)

**E12 — Cancelar no clona nada**
- Dado: el diálogo de clonar abierto
- Cuando: se cancela
- Entonces: ningún catálogo gana un sistema

**E13 — Sin sistema activo, el botón "Clonar" sigue deshabilitado**
- Dado: el catálogo sin sistema activo
- Cuando: se mira la barra de sistemas
- Entonces: "Clonar" está deshabilitado, igual que "Renombrar" y "Borrar" (spec 026, E11)

## Preguntas abiertas

Ninguna. Las tres que tenía el borrador se resolvieron con el usuario antes de congelar:

1. **Nombre sugerido:** se deja «‹Nombre› (copia)» fijo y editable, sin sufijo condicional. Ver
   "Fuera de alcance".
2. **Equipo activo tras clonar a varios:** el del original si está entre los marcados; si no, el
   primero de los marcados en el orden del formulario. Ver E11.
3. **Reintento de escritura parcial:** se acepta el mismo límite que la spec 048. Ver "Fuera de
   alcance".

## Al cerrar

Los 13 escenarios se cumplen. Partida: 488 tests (tras cerrar la spec 061) → 498 al cerrar —
10 nuevos con test directo: `domain/catalogo-sistemas.spec.ts` para E1/E3/E4/E6 (la firma nueva
de `clonarSistema`), `application/sistema.store.spec.ts` para E1-E5, E7 y E11. E8-E10, E12 y E13
son interacción y render puros — verificados con `npm run build` (compilación estricta de
plantillas) y revisión de código, mismo criterio que las specs 026 y 048, que tampoco tienen
`tablero.spec.ts` ni `dialogo-sistema.spec.ts`. `npm run typecheck` y `npm run format:check`
limpios. No existe script `test:coverage` en el proyecto; no se reporta cobertura.

**Desviaciones respecto a lo especificado:** ninguna. El diseño acordado al congelar (copias
independientes por equipo, todo o nada, equipo activo = el del original si está marcado, nombre
sugerido «(copia)» fijo) se implementó tal cual.

**`clonarSistema` (dominio) y `SistemaStore.clonar` cambiaron de firma sin overload, igual que
hizo la spec 048 con `crear`.** `clonarSistema(sistema, id, nombre, existentes)` →
`clonarSistema(sistema, id, nombre, equipoId, existentes)`; `clonar(nombre)` →
`clonar(nombre, equiposId)`. 11 llamadas en tests adaptadas mecánicamente (10 en
`catalogo-sistemas.spec.ts`, 4 en `sistema.store.spec.ts` — algunas ya contadas) más la única
real en `Tablero.confirmarDialogoSistema`. Se descartó mantener la forma antigua por lo mismo
que la 048: un solo punto de llamada real no justifica dos maneras de llamar a lo mismo.

**El test `032-E4` ("el clon mantiene el mismo equipo que el original") se reconvirtió en
`063-E1/E3` ("el clon va al equipo indicado").** Su premisa —que clonar nunca cambia de
equipo— es justo lo que esta spec levanta. No es un test tocado en refactor: la firma nueva lo
obligaba a cambiar de todos modos, y su afirmación de producto ya no es cierta.

**`DialogoSistema` ganó un input `mostrarEquipo`, separado de `mostrarTipo`.** Hasta ahora el
bloque de equipo (spec 048) vivía dentro del `@if (mostrarTipo())`, que solo se enciende al
crear. Clonar necesita el equipo sin el tipo, así que se partieron en dos `@if`. `puedeConfirmar`
pasó a exigir "≥1 equipo marcado" solo cuando `mostrarEquipo` está activo.

**Ningún ADR nuevo ni cambio en `docs/dominio.md`:** no es una regla de voleibol ni una decisión
de arquitectura — es la ampliación natural de un flujo (clonar), documentada en el comentario de
cabecera de `clonar()` y `clonarSistema()`. Sí se actualizó `docs/arquitectura.md` (ADR 0027):
las descripciones de `clonarSistema`, `clonar` y `DialogoSistema` decían explícitamente
"mantiene su equipo, sin parámetro propio", ya falso.

**Límite heredado, no resuelto (pregunta 3):** el reintento de una escritura parcial a dos
equipos puede dejar una copia de más, igual que en `crear` desde la spec 048. Queda anotado en
el comentario de `clonar()`.
