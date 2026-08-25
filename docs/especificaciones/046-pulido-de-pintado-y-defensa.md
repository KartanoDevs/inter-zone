# 046 — Pulido del panel de Pintado y de la pista de defensa

**Estado:** Completada
**Paso de la hoja de ruta:** 7 (sistemas de defensa)

## Problema

Tras implementar el panel de Pintado (specs 044-045) y usarlo en la práctica, aparecen siete
fricciones sueltas, ninguna lo bastante grande para su propia spec, pero todas reales:

1. Seleccionar un jugador en defensa salta siempre a la pestaña Enseñanza, aunque el entrenador
   esté pintando zonas y no quiera escribir ninguna explicación.
2. La barra de ancho de bloqueo es estrecha: mover el valor con precisión cuesta más de lo que
   debería.
3. El tope del dial (10) coincide con el ancho real que calcula el dominio — pero en la pizarra
   interesa poder pasarse de ese ancho para marcar un bloqueo especialmente cerrado.
4. Nada impide arrastrar dos fichas al mismo punto exacto, en recepción o en defensa: se
   solapan y dejan de poder seleccionarse por separado.
5. La etiqueta "Mover bloqueo" es ambigua: lo que se mueve es la sombra, no el bloqueo en sí
   (los puestos que bloquean siguen fijos donde están).
6. La leyenda de defensa tiene dos entradas con la misma letra "C" — central y colocador
   rival — indistinguibles.
7. El selector "Zona de defensa" / "Zona de finta" no se distingue bien cuál está activo; y la
   leyenda general (el botón "Ver leyenda de etiquetas") mezcla las etiquetas de recepción con
   las de defensa aunque solo una de las dos aplique en cada sistema.

## Objetivo

Las siete fricciones desaparecen: seleccionar no fuerza la pestaña en defensa; la barra ocupa
todo el ancho disponible del panel; el dial permite un 25% más de ancho que el real, con el
resto de la escala reajustada proporcionalmente; ninguna ficha puede solaparse con otra, en
ningún modo; la etiqueta dice "Mover sombra de bloqueo"; central pasa a "Ce" y el colocador
rival a "CR"; el selector de zona muestra con claridad cuál está activo; y la leyenda general
muestra solo las etiquetas que existen en el modo activo.

**Esta spec toca `domain/`, `application/` y `ui/`.** El límite de separación entre fichas es
geometría nueva (`domain/separacion.ts`); el resto son ajustes de estado y de pantalla ya
autorizados por las specs 041-045 para estas mismas capas.

## Fuera de alcance

- Cualquier cambio en `domain/sombra-bloqueo.ts`: ni `ANCHO_BLOQUEADOR` ni `HOLGURA_VANO` se
  tocan. El nuevo tope del dial sigue siendo puramente de pantalla (spec 044-045).
- Impedir el solape mediante una regla de falta posicional (`domain/validacion.ts`): la
  separación mínima no es una falta, es un límite de arrastre — nunca se guarda un estado
  inválido que rechazar, porque nunca llega a producirse.
- Rediseñar la pestaña Enseñanza o el flujo de guardado: el escenario 1 solo cambia cuándo se
  navega a esa pestaña, no qué contiene ni cómo se guarda.

## Escenarios

### Navegación al seleccionar (defensa)

**E1 — Seleccionar un jugador en defensa no cambia de pestaña**
- Dado: un sistema de defensa, con el panel abierto en cualquier pestaña que no sea Enseñanza
- Cuando: se selecciona un puesto con un toque (no un arrastre)
- Entonces: el panel se queda en la pestaña donde estaba

**E2 — Si ya se estaba en Enseñanza, seleccionar actualiza su contenido igual que siempre**
- Dado: la pestaña Enseñanza abierta
- Cuando: se selecciona otro puesto
- Entonces: Enseñanza muestra la explicación del puesto recién seleccionado, sin necesidad de
  cambiar de pestaña porque ya se estaba en ella

**E3 — En recepción no cambia nada**
- Dado: un sistema de recepción
- Cuando: se selecciona un jugador con un toque
- Entonces: sigue saltando a Enseñanza, como antes de esta spec (spec 010) — el ajuste es solo
  para defensa
- **Corregido en una sesión posterior, el mismo día:** el usuario pidió generalizar la regla a
  los dos modos, y además cubrir el panel plegado: un simple toque en un jugador **nunca** fuerza
  la pestaña Enseñanza ni la despliega si estaba plegada, ni en recepción ni en defensa. Solo
  actualiza el contenido de Enseñanza si ya se estaba viendo, con el panel ya desplegado. El
  arrastre que reposiciona una ficha en pista (spec 027, E1) no se toca: sigue llevando a
  Enseñanza al soltar, en los dos modos — el usuario solo mencionó "hacer click", no arrastrar.

### Barra y dial de ancho

**E4 — La barra ocupa todo el ancho disponible del panel**
- Dado: el panel de Pintado abierto en un sistema de defensa
- Cuando: se mira el control de ancho del bloqueo
- Entonces: la barra se extiende a lo ancho del panel, no solo una franja estrecha junto a su
  etiqueta

**E5 — El tope del dial es un 25% más ancho que el real**
- Dado: el dial en 10 (su tope)
- Cuando: se mira la sombra
- Entonces: su ancho lateral es 1,25 veces el que calcula `sombraDeBloqueo`, no el mismo

**E6 — El resto de la escala se reparte proporcionalmente**
- Dado: el dial en 5 (su valor de fábrica)
- Cuando: se compara el ancho de la sombra con el que salía antes de esta spec
- Entonces: es mayor que antes — la mitad de 1,25, no la mitad de 1

### Sin solapes

**E7 — Dos fichas nunca quedan exactamente en el mismo punto**
- Dado: dos jugadores o dos puestos ya colocados
- Cuando: se arrastra uno de ellos hasta el punto exacto donde está el otro
- Entonces: se detiene a una distancia mínima del otro, en vez de superponerse

**E8 — La distancia mínima nunca abre un pasillo de luz en la sombra de bloqueo**
- Dado: dos puestos que bloquean, empujados hasta quedar justo a la distancia mínima permitida
  entre ellos
- Cuando: se calcula la sombra
- Entonces: sus dos tramos de red se siguen fusionando en una sola pared (spec 040, E7) — la
  distancia mínima elegida nunca basta por sí sola para separar dos sombras que deberían seguir
  unidas

**E9 — Aplica igual en recepción y en defensa**
- Dado: cualquiera de los dos tipos de sistema
- Cuando: se arrastra una ficha hacia otra ya colocada
- Entonces: se detiene a la misma distancia mínima en los dos casos

### Etiquetas y leyenda

**E10 — "Mover bloqueo" pasa a "Mover sombra de bloqueo"**
- Dado: el panel de Pintado
- Cuando: se mira el selector de acción
- Entonces: la segunda opción dice "Mover sombra de bloqueo"

**E11 — El central se etiqueta "Ce"; el colocador rival, "CR"**
- Dado: un sistema de defensa
- Cuando: se mira el puesto del central (3) y la ficha del colocador rival
- Entonces: el puesto muestra "Ce" y el colocador rival "CR" — ya no comparten letra

**E12 — El selector de zona distingue con claridad cuál está activo**
- Dado: el panel de Pintado
- Cuando: se mira el selector "Zona de defensa" / "Zona de finta"
- Entonces: la opción activa se distingue de la inactiva a simple vista, no solo por un borde
  fino

**E13 — La leyenda general muestra solo lo que existe en el modo activo**
- Dado: la ventana "Leyenda de etiquetas"
- Cuando: se abre en un sistema de recepción, o en uno de defensa
- Entonces: en recepción se ven solo las etiquetas de rol de recepción; en defensa, solo las
  propias de defensa — nunca las dos listas mezcladas

## Preguntas abiertas

Ninguna. Resueltas al implementar, siguiendo el mismo criterio que specs anteriores de esta
sesión (el usuario delega la validación de los detalles menores):

- **Distancia mínima entre fichas: 0,9 m.** Dos radios de ficha (0,45 m cada una,
  `ui/pista/ficha-jugador.ts`) — el mínimo que evita que dos círculos lleguen a tocarse — y por
  debajo del 1 m de referencia que la spec 040 (E7) ya fijó como "bloqueadores casi tocándose,
  siguen fusionando su sombra" (`ANCHO_BLOQUEADOR` 0,4 + `HOLGURA_VANO` 0,6). No es una regla de
  voleibol: es un límite de herramienta para que las fichas sigan siendo seleccionables por
  separado.
- **El pasillo de luz no se calcula, se acota matemáticamente** (E8): en vez de un test que
  ejecute `sombraDeBloqueo` con dos puestos a 0,9 m y compruebe que da una sola pared, el test
  comprueba directamente que `DISTANCIA_MINIMA_ENTRE_JUGADORES ≤ ANCHO_BLOQUEADOR + HOLGURA_VANO`
  — la condición matemática exacta que hace esa fusión inevitable, más simple y más a prueba de
  que alguien cambie una de las dos constantes por separado en el futuro.

## Al cerrar

Los 13 escenarios pasan. Suite: 319 tests al arrancar esta spec (cierre de la 045) → 329 al
cerrarla — 7 en `domain/separacion.spec.ts` (función pura nueva) y 3 en
`application/sistema.store.spec.ts` (E7/E9 en defensa y recepción, más el caso sin nadie cerca).
E1-E6 y E10-E13 son interacción, geometría de render y CSS puros, sin `tablero.spec.ts` ni
`pista.spec.ts` en el proyecto: verificados con typecheck + build + revisión de código + recarga
del servidor de desarrollo, mismo criterio que el resto de esta serie. `npm run typecheck` y
`npm run build` limpios; `tablero.css` se queda en 7,09 kB, sin cambios — ninguno de los siete
puntos tocó ese fichero.

**El escenario más delicado (E7-E8, sin solapes) se resolvió con una desviación deliberada del
plan inicial.** La primera idea fue comprobar E8 ejecutando `sombraDeBloqueo` de verdad con dos
puestos empujados a la distancia mínima y verificando que produce un único polígono. Se descartó
en el diseño, antes de escribir el test: la fusión de tramos depende de tres números —
`ANCHO_BLOQUEADOR`, `HOLGURA_VANO` y la distancia entre bloqueadores— y un test geométrico
completo no dejaría tan visible *por qué* nunca se abre un hueco. En su lugar, el test comprueba
la desigualdad exacta (`DISTANCIA_MINIMA_ENTRE_JUGADORES ≤ ANCHO_BLOQUEADOR + HOLGURA_VANO`) que
garantiza la fusión — más corto, y a prueba de que alguien cambie una de las tres constantes por
separado sin darse cuenta de que rompe la otra.

**Descubrimiento real, no anticipado: los tests existentes de "amontonados" de la spec 038 (E14,
E15, E16 y el test de 039-E2) seguían pasando sin cambiar una línea**, pese a que
`colocarOMover` ya no permite el solape exacto que sus nombres describen. Investigado: ninguno
de ellos comprueba las coordenadas finales de los seis puestos, solo invariantes que siguen
siendo ciertos igual (`resultadoValidacion()` nulo, `puedeGuardar()`, o el punto del primer
puesto en llegar — que nunca se desplaza, porque `colocarOMover` solo aparta al que llega
después de uno ya existente). El nombre de esos escenarios ("aunque estén amontonados") ya no
describe con precisión lo que pasa en pantalla desde esta spec — los seis puestos se abren en
abanico en vez de apilarse—, pero como ningún test dependía de ese detalle visual, no hizo falta
tocarlos. Se deja anotado aquí en vez de corregir en silencio la spec 038, que sigue siendo
correcta en todo lo que sí comprueba.

**Ningún ADR nuevo.** El límite de separación es una decisión de implementación de una spec ya
autorizada para tocar `domain/`, no una decisión estructural que vaya a necesitar explicarse a
seis meses vista fuera del propio código de `separacion.ts` (que ya lleva el razonamiento en su
comentario de cabecera).

**Addendum, el mismo día:** el usuario pidió generalizar E1-E3 a los dos modos y cubrir también
el panel plegado (nota en E3, arriba). El cambio quedó en una única línea de
`ui/tablero/tablero.ts`: el toque de selección deja de llamar a `irAEnsenanza()` en cualquier
caso — antes solo lo evitaba en defensa. 329 tests siguen en verde (el comportamiento no tenía
test de aplicación que lo cubriera, solo el de `ui/`, verificado con build y revisión de código).
No hizo falta ninguna spec nueva: es la misma pieza de la 046, corregida antes de que nadie
llegara a depender del matiz "solo en defensa".

**Bug real encontrado de paso, no buscado:** el servidor de desarrollo, al recompilar, sacó en
consola `NG0955` (claves de `@for` duplicadas) desde `panel-pintado.html` — la leyenda de chips
seguía usando `track entrada.etiqueta`, y desde que "Ce"/"CR" sustituyeron a las dos "C" (E11),
`ETIQUETA_PUESTO` todavía repite "CO" (puestos 1 y 2) y "R" (puestos 4 y 6) — nunca dejó de
repetirlas, esta spec solo arregló la colisión de "Central"/"Colocador rival". Corregido
cambiando el track a `entrada.indiceColor`, que sí es único por puesto (`INDICE_COLOR_POR_PUESTO`).
El modal general "Leyenda de etiquetas" (`pista.html`) sigue con `track entrada.etiqueta`, pero
ahí ya no colisiona: la lista de defensa quedó con seis etiquetas distintas tras el E11 de esta
misma spec.

**Lo que no se desvió:** las dos preguntas resueltas al implementar (0,9 m como distancia
mínima, la desigualdad matemática en vez de un test geométrico completo para E8) se mantuvieron
tal cual hasta el cierre.
