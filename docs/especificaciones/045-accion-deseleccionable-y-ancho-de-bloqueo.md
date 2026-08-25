# 045 — La acción de arrastre se puede deseleccionar; el dial pasa a controlar el ancho

**Estado:** Completada
**Paso de la hoja de ruta:** 7 (sistemas de defensa)

## Problema

El selector "Pintar / Mover bloqueo" de la spec 044 obliga a que uno de los dos esté siempre
activo. En la práctica, el entrenador a veces solo quiere mirar el campo sin arrastrar nada por
accidente — hoy no hay forma de dejar el arrastre inerte salvo eligiendo un modo y evitando
tocar la pista.

Además, "Mover bloqueo" no tiene sentido cuando no hay ningún bloqueador declarado (la postura
inicial, que siempre tiene 0 bloqueadores — spec 039-E4): hoy el selector deja elegirlo igual,
y arrastrar la sombra en ese estado no tiene nada que mover.

Por último, el dial de tamaño de sombra de la spec 044 escalaba el polígono entero — ancho y
profundidad a la vez — desde el 0 al 100%. El entrenador quiere ajustar específicamente cuánto
**ancho** de red tapa el bloqueo (lo que decide cuántos puestos entran en su sombra lateral), sin
tocar cuánto se proyecta hacia el fondo (la profundidad, que ya depende correctamente de dónde
ataca el rival).

## Objetivo

El selector de acción admite un tercer estado, "ninguna": clicar la opción ya activa la apaga.
"Mover bloqueo" aparece deshabilitado cuando la variante activa tiene 0 bloqueadores. El dial
pasa a moverse en enteros de 0 a 10, con 5 de fábrica, y escala solo el ancho lateral de la
sombra — su profundidad hacia el fondo queda siempre igual a la que calcula el dominio.

**Esta spec corrige la spec 044** en dos puntos de sus escenarios (E1-E4 sobre la acción, E5-E9
sobre el dial) y toca solo `application/` y `ui/` — sigue sin tocar `domain/`: ni el escalado ni
la deshabilitación cambian ninguna regla de voleibol, son estado de pantalla.

## Fuera de alcance

- **`ANCHO_BLOQUEADOR` en `domain/sombra-bloqueo.ts` sigue sin tocarse.** El dial no cambia el
  cálculo de `sombraDeBloqueo`; sigue siendo un factor de escala aplicado al dibujar, ahora solo
  sobre el eje lateral del polígono ya calculado.
- **Persistir el ajuste por sistema o por variante**: sigue siendo global a la app, como ya fijó
  la spec 044.
- **Deshabilitar "Pintar"**: nunca se deshabilita en un sistema de defensa — pintar zonas no
  depende de que haya bloqueadores.

## Escenarios

### Acción deseleccionable

**E1 — Clicar la opción ya activa la apaga**
- Dado: "Pintar" seleccionado
- Cuando: se clica "Pintar" de nuevo
- Entonces: ninguna de las dos opciones queda seleccionada

**E2 — Con ninguna opción activa, arrastrar el campo no pinta**
- Dado: ninguna acción seleccionada
- Cuando: se arrastra sobre el campo
- Entonces: no se marca ninguna celda

**E3 — Con ninguna opción activa, arrastrar la sombra no la mueve**
- Dado: ninguna acción seleccionada, una variante con sombra visible
- Cuando: se arrastra sobre la sombra
- Entonces: no se desplaza

**E4 — Clicar la opción apagada la vuelve a activar**
- Dado: ninguna acción seleccionada
- Cuando: se clica "Pintar" o "Mover bloqueo"
- Entonces: esa opción queda activa, con el comportamiento que ya fijó la spec 044 (E2/E3)

### "Mover bloqueo" deshabilitado sin bloqueadores

**E5 — Sin bloqueadores, "Mover bloqueo" aparece deshabilitado**
- Dado: la variante activa con 0 bloqueadores (incluida la postura inicial, que siempre los
  tiene a 0)
- Cuando: se mira el selector de acción
- Entonces: "Mover bloqueo" no se puede seleccionar; "Pintar" sigue disponible

**E6 — Bajar a 0 bloqueadores con "Mover bloqueo" activo lo deselecciona**
- Dado: "Mover bloqueo" seleccionado, con al menos un bloqueador
- Cuando: se cambia a una variante con 0 bloqueadores (situación, caso o número de bloqueadores)
- Entonces: la acción queda en "ninguna" — no se reactiva sola si más tarde vuelve a haber
  bloqueadores

**E7 — "Pintar" nunca se deshabilita**
- Dado: cualquier número de bloqueadores, incluida la postura inicial
- Cuando: se mira el selector
- Entonces: "Pintar" siempre se puede seleccionar

### El dial: ancho, no profundidad

**E8 — El dial va de 0 a 10, en enteros, con 5 de fábrica**
- Dado: la app recién abierta, sin ajustes guardados antes
- Cuando: se mira el dial en un sistema de defensa
- Entonces: marca 5; moverlo solo produce valores enteros entre 0 y 10

**E9 — El dial escala el ancho de la sombra, nunca su profundidad**
- Dado: una variante con sombra visible
- Cuando: se mueve el dial a un valor `v` entre 0 y 10
- Entonces: la extensión lateral (eje X) de cada vértice del polígono se escala por `v / 10`
  respecto al punto medio del borde que toca la red; la coordenada de profundidad (eje Y) de
  cada vértice no cambia

**E10 — En 10, el ancho es exactamente el que calcula el dominio**
- Dado: el dial en 10
- Cuando: se mira la sombra
- Entonces: coincide con el polígono de `sombraDeBloqueo`, sin escalar en ningún eje

## Preguntas abiertas

Ninguna. Resueltas al congelar esta spec:

- **Qué significa "ancho" en el polígono:** el eje X (lateral, paralelo a la red), no el eje Y
  (profundidad hacia el fondo). Es la lectura literal de "modifica el ancho, no el largo" sobre
  la geometría que ya describe `docs/dominio.md` ("la sombra se abre en cono desde la red hacia
  el fondo").
- **Migración del ajuste persistido:** el campo `escalaSombra` cambia de rango (antes 0-100,
  ahora 0-10) y de eje que escala. Un valor antiguo (por ejemplo 75) ya no tiene el mismo
  significado bajo la regla nueva, así que esta spec sube la versión del payload de
  `LocalStorageAjustesRepository` — cualquier valor guardado con la spec 044 se descarta y vuelve
  al 5 de fábrica, en vez de reinterpretarse silenciosamente.

## Al cerrar

Los 10 escenarios pasan. Suite: 312 tests al arrancar esta spec (cierre de la 044) → 319 al
cerrarla — 7 nuevos en `application/sistema.store.spec.ts` (E1, E4-E7, más el redondeo a enteros
del dial) y 1 en `infrastructure/local-storage-ajustes.repository.spec.ts` (versión 5 con el
rango antiguo, descartada sin reinterpretarse). E2-E3 y E9-E10 son interacción y geometría de
render puros, sin `pista.spec.ts` ni `barra.spec.ts` en el proyecto: verificados con typecheck +
build + revisión de código + recarga del servidor de desarrollo, mismo criterio que las specs
anteriores de esta serie. `npm run typecheck` y `npm run build` limpios; `tablero.css` se queda
en 7,09 kB, sin cambios respecto al cierre de la 044 — esta spec no le tocó ni una línea.

**Se implementó la Opción C del boceto previo (`/design`), no la 2 de la ronda de mejoras.** El
usuario pidió "implementa la 2" refiriéndose al segundo boceto del artefacto de esta sesión
(*Panel de Pintado v2*: "Segmentado XL + barra"), distinto de la numeración de la ronda de
`/design` anterior. Se confirmó por descarte: es la única de las cinco opciones que combina un
segmentado grande de dos bloques con una barra horizontal en vez de un dial — exactamente lo que
pedía el mensaje ("en lugar de solo el knob, quiero ver cómo se hace con otra barra").

**Decisión de diseño no trivial: se retiró `Knob` en vez de dejarlo sin usar.** La spec 044 lo
había extraído a `ui/comun/knob.ts` para resolver el presupuesto de CSS de `tablero.css`. Esta
spec lo sustituye por completo por `ui/comun/barra.ts` (misma interfaz — `valor`, `etiqueta`,
`valorCambiado` — mismo patrón de arrastre por puntero y flechas de teclado, en formato lineal).
Con `Knob` ya sin ningún consumidor, se borró en vez de dejarlo como código muerto a la espera
de un uso futuro que no está pedido — `docs/flujo-de-trabajo.md` y el CLAUDE.md del proyecto
piden menos código y menos ficheros como valor por defecto.

**Reinterpretación deliberada de "ancho, no largo" como eje de render, no como
`ANCHO_BLOQUEADOR`.** El mensaje anterior (`/design`) pedía literalmente que el dial modificase
"el ancho, no el largo del bloqueo", lo que podía leerse como reabrir `domain/sombra-bloqueo.ts`
(la constante física del ancho de manos de un bloqueador, fuera de alcance explícito de la spec
044). Se resolvió sin inventar esa regla de voleibol: el polígono de la sombra ya tiene un eje
lateral (ancho, perpendicular a la red) y un eje de profundidad (largo, hacia el fondo);
`escalarSombra` en `ui/pista/pista.ts` pasa de escalar los dos ejes a la vez a escalar solo el
eje X (lateral), dejando Y intacto — satisface la frase literal del usuario sin tocar
`domain/` ni inventar una correspondencia en metros que nadie pidió confirmar todavía. Se anotó
la alternativa (`ANCHO_BLOQUEADOR` configurable) como rechazada explícitamente, no olvidada.

**El guardado de la acción de arrastre vive en `cambiarContexto()`, un único punto para las
cinco rutas que pueden vaciar los bloqueadores** (`seleccionarCaso`, `seleccionarSituacion`,
`seleccionarBloqueadores`, y las tres ramas de `confirmarCambio`): en vez de repetir el
apagado de "mover" en cada método, se centralizó en la cola común que todos ya llamaban. Es
idempotente — comprobar `accionArrastre() === 'mover' && !puedeMoverBloqueo()` no hace nada si
la condición no se cumple —, así que no hay coste en las rutas que no tocan bloqueadores
(cambiar de rotación en recepción, activar un sistema, etc.).

**`docs/especificaciones/044-*.md` se corrigió in situ** en sus escenarios E1, E4-E7 (acción
tri-estado, rango y eje del dial), con notas que apuntan aquí — mismo criterio que las specs 043
y 042 con sus predecesoras. No hizo falta ningún ADR nuevo: ninguna decisión estructural nueva
por encima de lo que ya fijó la 0035 (nada de dominio, todo aplicación y render).

**Lo que no se desvió:** las tres preguntas resueltas al congelar la spec (ancho = eje X,
versión del payload descartada sin reinterpretar, "Pintar" nunca deshabilitado) se implementaron
tal cual.
