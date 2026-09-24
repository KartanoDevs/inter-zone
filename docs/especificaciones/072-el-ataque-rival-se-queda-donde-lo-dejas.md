# 072 — El ataque rival se queda donde lo dejas

**Estado:** Completada
**Paso de la hoja de ruta:** 7 (sistemas de defensa)

**Depende de:** specs 038, 039, 040 y 042 (caso del colocador, bloqueadores, sombra, postura por
defecto), congeladas e implementadas antes de congelar esta.

## Problema

En defensa, el entrenador arrastra la ficha "A" del atacante rival para ver cómo reacciona la
sombra de bloqueo en vivo mientras la mueve. Pero al soltarla, la ficha salta siempre al punto
canónico de su situación (`PUNTO_POR_SITUACION`) — nunca se queda donde el entrenador la dejó.
Hoy eso es intencional (`docs/decisiones/0020-*.md`, `0033-*.md`): solo se guarda *contra qué
zona* ataca el rival, nunca el punto exacto. Pero el entrenador quiere afinar dentro de esa zona
— por ejemplo, marcar que ese ataque por 4 viene muy pegado a la antena, no centrado en el
tercio — y hoy no hay manera de dejar eso guardado.

Esta spec es también la base de dos peticiones más del entrenador (specs 073 y 074): poder
colocar al colocador rival y al central rival como fichas de referencia, y poder sacarlas y
volver a traerlas desde un banquillo. Las tres comparten el mismo problema de fondo — el campo
rival no tiene hoy ningún elemento colocable y persistido — y se resuelven con el mismo modelo
para no repetirlo tres veces.

## Objetivo

El punto donde el entrenador suelta la ficha "A" se guarda con la variante de defensa activa, y
la sombra de bloqueo se calcula desde ese punto guardado, no desde el canónico de la situación.

## Fuera de alcance

- **El central enemigo y el banquillo rival.** Es la spec 073 y la 074. Esta solo introduce el
  modelo de marcador rival y lo usa para el atacante.
- **Cambiar qué situación resulta de soltar en cada zona** (`docs/dominio.md`, tabla de
  condiciones z2/z3/z4/pipe/z1). Sigue siendo la situación, no el punto, la que identifica la
  variante `(caso, situacion, bloqueadores)` — ver ADR nueva.
- **Migrar las variantes de defensa ya guardadas.** Nacen sin marcador de atacante, exactamente
  como se ven hoy (mismo criterio que la ADR 0030). El punto guardado solo aparece a partir de la
  primera vez que el entrenador suelta la ficha después de esta spec.
- **Compartir el marcador entre variantes del mismo sistema.** Cada combinación
  `(caso, situacion, bloqueadores)` guarda su propio punto de atacante — igual que
  `desplazamientoSombra` ya es por variante (ADR 0033) —, no por sistema entero.
- **Recepción.** Un sistema de recepción no tiene ficha "A"; no cambia nada en ese modo.
- **Cualquier cambio en el cálculo geométrico de la sombra** (`domain/sombra-bloqueo.ts`): sigue
  recibiendo un punto de atacante y una lista de bloqueadores, igual que hoy. Solo cambia de
  dónde sale ese punto.

**Esta spec toca `application/`, `infrastructure/`, `server/` y `ui/`, además de `domain/`**: el
punto del atacante pasa de calculado a persistido, así que hay que guardarlo, leerlo y pintarlo
en las cuatro capas — mismo alcance que las specs 038-040.

## Escenarios

### Persistencia del punto

**E1 — Soltar la ficha "A" dentro de su tercio guarda el punto exacto**
- Dado: una variante de defensa activa, situación `z4`
- Cuando: se arrastra la ficha "A" a un punto dentro del tercio de `z4` y se suelta
- Entonces: la ficha se queda en ese punto exacto (no salta a `PUNTO_POR_SITUACION.z4`), y la
  situación de la variante sigue siendo `z4`

**E2 — El punto guardado sobrevive a recargar la página**
- Dado: una variante con el atacante movido y guardada
- Cuando: se recarga la página y se vuelve a esa combinación de caso, situación y bloqueadores
- Entonces: la ficha "A" aparece en el mismo punto donde se dejó, no en el canónico

**E3 — Cada variante guarda su propio punto**
- Dado: dos variantes de la misma situación con distinto número de bloqueadores (p. ej. `z4` con
  1 y con 2 bloqueadores), cada una con el atacante movido a un punto distinto
- Cuando: se alterna entre ellas
- Entonces: cada una muestra su propio punto guardado, sin mezclarse

**E4 — Una variante nunca tocada nace en el punto canónico**
- Dado: una combinación de caso, situación y bloqueadores que nunca se ha guardado
- Cuando: se entra a ella
- Entonces: la ficha "A" aparece en `PUNTO_POR_SITUACION` de esa situación, igual que hoy

**E5 — La postura inicial sigue sin ficha "A"**
- Dado: la situación `inicial`
- Cuando: se mira el campo rival
- Entonces: no hay ficha "A" que arrastrar ni que guardar — no cambia respecto a hoy

**E6 — El punto guardado queda acotado al campo rival**
- Dado: un intento de soltar la ficha fuera de los límites del campo rival
- Cuando: se suelta
- Entonces: el punto que se guarda es el acotado a esos límites, igual que ya hace
  `acotarPuntoRival` con el punto de arrastre en vivo

### Interacción con la situación y la sombra

**E7 — Soltar fuera del tercio de la situación activa cambia de variante**
- Dado: la ficha "A" arrastrada desde el tercio de `z4` hasta el de `z2`
- Cuando: se suelta en `z2`
- Entonces: la variante activa pasa a ser la de `z2` (con su propio punto guardado o el canónico
  si nunca se tocó) — la situación sigue siendo la que manda, no el punto (ver ADR nueva)

**E8 — La sombra se recalcula desde el punto guardado, no desde el canónico**
- Dado: una variante con el atacante movido y con bloqueo activo
- Cuando: se entra a esa variante sin arrastrar nada
- Entonces: la sombra de bloqueo se dibuja como si el atacante estuviera en el punto guardado

**E9 — Mientras se arrastra, la sombra sigue el puntero como hoy**
- Dado: una variante con bloqueo activo
- Cuando: se arrastra la ficha "A"
- Entonces: la sombra se recalcula en cada instante del arrastre (sin cambios respecto a la spec
  040); solo cambia qué ocurre *al soltar*

### Compatibilidad

**E10 — Una variante ya guardada antes de esta spec no cambia de aspecto**
- Dado: una variante de defensa guardada con una versión anterior de la aplicación
- Cuando: se abre después de desplegar esta spec
- Entonces: la ficha "A" aparece en el punto canónico de su situación, exactamente igual que se
  veía antes — no hay ninguna migración de datos

**E11 — La leyenda de defensa no cambia**
- Dado: el modo defensa, con o sin el atacante movido de su punto canónico
- Cuando: se abre la leyenda
- Entonces: sigue mostrando una única entrada `'A' → 'Atacante'` (`ENTRADAS_LEYENDA_DEFENSA`,
  `ui/pista/pista.ts`) — esta spec cambia de dónde sale el punto de la ficha, no qué fichas
  existen ni cómo se explican

## Preguntas abiertas

Ninguna: las tres decisiones que quedaban pendientes del análisis previo se cerraron con el
entrenador antes de redactar esta spec —

1. El punto se guarda **por variante**, no por sistema (justifica E3).
2. Las variantes existentes **no se migran**; nacen sin marcador (justifica E10).
3. Esta spec no introduce el central rival — se aparca para la 073, que sí decidirá si tiene un
   punto por defecto o nace siempre en el banquillo.

## Al cerrar

**Escenarios de dominio/aplicación (E1-E7, E10):** implementados con TDD estricto, un test por
escenario, ejecutados en `domain/sistema-defensa.spec.ts` y `application/sistema.store.spec.ts`.

**Una desviación real respecto al análisis previo a esta spec:** la sesión de diseño que llevó
a congelar la 072 había recomendado un tipo paralelo compartido `MarcadorRival` (con
`tipo: 'atacante' | 'colocador' | 'central'`) para dar servicio a la 072, la 073 y la 074 con un
solo concepto. Al implementar, se usó en su lugar un campo suelto `marcadorAtacante?: Punto` en
`VarianteDefensa`, calcado literalmente de `desplazamientoSombra` — ningún test de la 072 exigía
el tipo genérico, y añadirlo sin que un escenario lo pidiera habría sido código sin verificar
(regla de este mismo fichero). Consecuencia: la 073 hereda esta decisión y **no** introduce
`MarcadorRival`; añade su propio campo suelto `marcadorCentral?: Punto`, mismo patrón. Si en el
futuro aparece un cuarto marcador rival, ahí sí compensará generalizar — no antes.

**E6 (acotado al campo rival) y E11 (leyenda sin cambios):** no generaron test nuevo porque ya
estaban garantizados por construcción — `acotarPuntoRival` (sin cambios) se aplica antes de
llamar tanto a `seleccionarSituacion` como a `moverAtacante`, y `ENTRADAS_LEYENDA_DEFENSA` no se
tocó en ningún commit. Comprobado con `git diff`, no solo por inspección.

**E8-E9 (sombra en reposo y en vivo):** el único código de esta spec sin test automático,
porque el proyecto no tiene tests de componentes Angular (`tablero.ts`, `pista.ts` no tienen
`.spec.ts`, ni lo tenían antes de esta spec) — coherencia deliberada con la convención existente,
no un hueco de cobertura nuevo. El cambio es de una línea en el `computed sombra` de
`tablero.ts`: prioriza `arrastreAtacante() (en vivo) ?? marcadorAtacanteEdicion() (guardado) ??
PUNTO_POR_SITUACION (canónico)`. Se verificó relanzando la app (spec 040 ya cubre que la sombra
seguía al puntero; aquí solo cambia el punto de reposo).

**Lo que sorprendió, gratamente:** casi nada de código de UI hizo falta. `Pista` ya exponía
`situacionActiva`/`casoActivo` como inputs separados del punto pintado, así que bastó un input
opcional `marcadorAtacante` que sustituye a `PUNTO_POR_SITUACION` solo cuando existe — sin tocar
`teoria-tablero.ts` en absoluto (no le pasa el input, sigue viendo el canónico, tal como pide
"Fuera de alcance").

**Persistencia real añadida más allá del plan inicial:** columnas `atacante_x`/`atacante_y` en
`formacion_defensa` (migración `20260924120000_punto_atacante_rival`), mismo `CHECK` en pareja
que `sombra_dx`/`sombra_dy`, y lectura/escritura en `sistema.repositorio.ts`. No se pudo ejecutar
`sistemas.rutas.spec.ts` contra una base real en esta sesión (no hay Postgres levantado en
`localhost:5432`); se comprobó que ese mismo conjunto de tests falla igual en `main` antes de
este cambio (8 fallidos por conexión, idéntico antes y después), así que no es una regresión de
esta spec — pero **queda pendiente de verificación con la base de datos real, relanzando el stack
Docker**, antes de dar la persistencia de servidor por probada de extremo a extremo.

**Cobertura:** no existe el script `test:coverage` en este proyecto; no se inventa.
