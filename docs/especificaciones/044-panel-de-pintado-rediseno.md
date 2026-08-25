# 044 — El panel de Pintado se rediseña: acción con radio, tamaño de sombra con dial

**Estado:** Completada
**Paso de la hoja de ruta:** 7 (sistemas de defensa)

## Problema

El panel "Pintado" de la spec 041, en uso real, tiene tres fallos:

1. **Se ve roto.** El CSS usa `var(--border-subtle)`, un token que nunca se definió en
   `src/styles.css` — los botones quedan sin borde visible.
2. **La leyenda no muestra las dos zonas a la vez.** Es una única rejilla de 6 colores que el
   `grid` de CSS parte en dos columnas por casualidad de ancho, sin relación con el selector
   defensa/finta de arriba: para comparar el color de finta de un puesto con el de defensa hay
   que cambiar de modo y perder de vista el otro.
3. **El interruptor "Pintar al arrastrar" es un simple on/off.** No dice qué pasa en cada
   estado; el entrenador tiene que recordar que "apagado" significa "ahora se puede mover la
   sombra".

Además, la sombra del bloqueo (spec 040) se dibuja siempre a su tamaño geométrico real, sin
forma de agrandarla o encogerla en pantalla para hacer un punto de enseñanza ("mirad lo que pasa
si el bloqueo cierra más o menos").

## Objetivo

El panel de Pintado, rediseñado (Opción C de las tres presentadas): una franja compacta con un
selector de dos posiciones **Pintar / Mover bloqueo**, un dial para la **escala visual de la
sombra** (0–100 %, con 40 % de fábrica), el selector existente de zona de defensa/finta, y una
leyenda de chips que muestra siempre las dos zonas de cada puesto a la vez, sin depender de qué
modo esté activo.

**Esta spec toca `domain/` (ninguno: la escala es puramente de pantalla), `application/`,
`infrastructure/` y `ui/`.** El ajuste de escala es global a la app (mismo patrón que los otros
cuatro de `Ajustes`/`AjustesRepository`, spec 017), así que sube la versión del esquema
persistido en `localStorage`, igual que hizo la spec 017 y precisó la 024.

## Fuera de alcance

- **Cualquier cambio en el cálculo de la sombra** (`domain/sombra-bloqueo.ts`): `ANCHO_BLOQUEADOR`
  sigue fijo en 0,4 m. El dial no cambia dónde cae la sombra según el reglamento, solo cuánto se
  ve en pantalla — es una lupa, no una regla de voleibol. Se decidió así explícitamente al
  congelar esta spec, después de valorar y descartar hacer `ANCHO_BLOQUEADOR` configurable.
- **Guardar la escala por sistema o por variante.** Es un ajuste de pantalla del entrenador
  (como "mostrar números de metros"), no un dato del sistema: nunca viaja al servidor, nunca
  entra en `VarianteDefensa`.
- **Cambiar qué controla el selector defensa/finta** (spec 041): sigue decidiendo sobre qué
  campo escriben `pintarCelda`/`borrarCelda`. Esta spec solo cambia su sitio en el panel y, si
  hace falta por espacio, su estilo — no su comportamiento.
- **Cualquier cambio en la geometría de la sombra al arrastrarla** (`desplazarSombra`,
  `recentrarSombra`, spec 040): sigue igual. Lo que cambia es cuándo se puede agarrar (ver
  escenarios de acción).

## Escenarios

### Acción: pintar o mover el bloqueo

**E1 — El selector reemplaza al interruptor on/off, con "Pintar" activo por defecto**
- Dado: un sistema de defensa recién abierto
- Cuando: se mira el panel de Pintado
- Entonces: hay un selector de dos posiciones, "Pintar" y "Mover bloqueo", con "Pintar"
  seleccionado — no existe ya el interruptor on/off de la spec 041
- **Precisado por la spec 045:** el selector admite un tercer estado, "ninguna", al clicar la
  opción ya activa. Sigue siendo cierto que "Pintar" es el valor de fábrica.

**E2 — En "Pintar", arrastrar sobre el campo pinta, incluso donde está la sombra**
- Dado: "Pintar" seleccionado
- Cuando: se arrastra sobre una zona del campo cubierta por la sombra del bloqueo
- Entonces: se pinta el trazo — mismo resultado que 041-E11, la sombra no lo impide

**E3 — En "Mover bloqueo", arrastrar la sombra la desplaza; el resto del campo no pinta**
- Dado: "Mover bloqueo" seleccionado
- Cuando: se arrastra la sombra
- Entonces: se desplaza (spec 040); arrastrar cualquier otra zona del campo no marca ninguna
  celda

**E4 — Cambiar de modo no descarta nada**
- Dado: celdas ya pintadas y la sombra con un desplazamiento propio
- Cuando: se cambia entre "Pintar" y "Mover bloqueo"
- Entonces: ni las celdas pintadas ni el desplazamiento de la sombra se pierden
- **Precisado por la spec 045:** lo mismo vale entrando o saliendo del estado "ninguna".

### Tamaño de la sombra

**E5 — El dial arranca en 40 %**
- Dado: la app recién abierta, sin ajustes guardados antes
- Cuando: se mira el panel de Pintado de un sistema de defensa
- Entonces: el dial de tamaño de sombra marca 40
- **Corregido por la spec 045:** el dial pasa a ir de 0 a 10 en enteros, con 5 de fábrica — no
  40 sobre 100. La 045 explica el porqué.

**E6 — Mover el dial escala la sombra en pantalla, anclada al lado de la red**
- Dado: una variante con sombra visible
- Cuando: se mueve el dial a un valor `v` entre 0 y 100
- Entonces: el polígono de la sombra se ve escalado por `v / 100` respecto a su tamaño calculado,
  con el borde que toca la red fijo — lo que crece o encoge es cuánto se proyecta hacia el fondo,
  no dónde empieza
- **Corregido por la spec 045:** el dial ya no escala el polígono entero (ancho y profundidad a
  la vez). Escala solo el ancho lateral (eje X); la profundidad (eje Y, cuánto se proyecta hacia
  el fondo) queda siempre igual a la calculada. El rango pasa a 0-10.

**E7 — En 100 %, la sombra se ve exactamente como la calcula el dominio**
- Dado: el dial en 100
- Cuando: se mira la sombra
- Entonces: coincide con el polígono que devuelve `sombraDeBloqueo`, sin escalar
- **Corregido por la spec 045:** el valor sin escalar es 10, no 100 (mismo criterio: en el
  máximo, coincide con el cálculo puro).

**E8 — El valor del dial persiste entre sesiones**
- Dado: el dial movido a un valor distinto del de fábrica
- Cuando: se recarga la página
- Entonces: el dial sigue en ese valor — mismo mecanismo que los otros cuatro ajustes globales

**E9 — El dial no toca ningún dato guardado**
- Dado: cualquier valor del dial
- Cuando: se guarda una variante de defensa
- Entonces: `desplazamientoSombra` y el resto de la variante se guardan igual que si el dial
  no existiera — la escala nunca llega a `domain/` ni al servidor

### Leyenda

**E10 — Los dos colores de cada puesto se ven a la vez, sin depender del modo activo**
- Dado: una formación de defensa con las seis fichas
- Cuando: se mira la leyenda del panel de Pintado
- Entonces: cada puesto aparece una sola vez, con su color de zona de defensa y su color de zona
  de finta (con la textura de puntos) visibles juntos — cambiar entre "Zona de defensa" y "Zona
  de finta" no oculta ninguna de las dos

## Preguntas abiertas

Ninguna. Resueltas al congelar esta spec (el usuario delegó la validación de los detalles
restantes tras elegir la Opción C del boceto):

- **`ANCHO_BLOQUEADOR` no se toca.** Es una medida física (el ancho de las manos de un
  bloqueador), no una preferencia de pantalla; convertirla en un dial 0–100 % inventaría una
  regla de voleibol que nadie ha pedido. El dial escala el dibujo, no el cálculo.
- **Ancla de la escala: el lado que toca la red.** Cualquier otra ancla (el centro del polígono,
  el punto del atacante) movería también el tramo de red que tapa el bloqueo, que es justo lo
  que no debe cambiar — ese tramo lo fija `puestosQueBloquean`, ajeno a esta spec.
- **El selector defensa/finta no desaparece.** Sigue haciendo falta para saber sobre qué campo
  escribe el pintado; esta spec lo reubica en la franja compacta, no lo retira, aunque la Opción
  C original no lo dibujara — omisión del boceto, no una decisión de producto.

## Al cerrar

Los 10 escenarios pasan. Suite: 307 tests al arrancar esta spec (cierre de la 041) → 312 al
cerrarla — 6 nuevos en `application/sistema.store.spec.ts` (E1, accionArrastre, E5, E8, recorte
0-100) y 1 en `infrastructure/local-storage-ajustes.repository.spec.ts` (versión 4 incompatible
sin `escalaSombra`). E2-E4 y E6-E7 y E9-E10 son interacción, geometría de render y CSS puros, sin
`tablero.spec.ts`, `pista.spec.ts` ni `knob.spec.ts` en el proyecto: verificados con typecheck +
build + revisión de código + recarga del servidor de desarrollo, mismo criterio que las specs
024, 042 y 041. `npm run typecheck` y `npm run build` limpios; el aviso de presupuesto de
`tablero.css` bajó de 7,99 kB a 7,09 kB respecto al cierre de la 041 — esta spec dejó el fichero
más pequeño de lo que lo encontró, no más grande, por la extracción de componentes de abajo.

**Decisión de diseño explícita, distinta a la propuesta original.** La Opción C del boceto
(`/design`, artefacto previo) no dibujaba el selector de zona de defensa/finta de la spec 041 —
una omisión del boceto, ya anotada como tal en las "Preguntas abiertas" de esta spec antes de
implementar. Se mantuvo en el panel, restilizado para la franja compacta, en vez de retirarlo:
sigue siendo la única forma de decidir sobre qué campo escriben `pintarCelda`/`borrarCelda`.

**Refactor no anticipado, forzado por el presupuesto de CSS (`angular.json`,
`anyComponentStyle`).** El primer intento dejó todo el marcado y el CSS nuevos dentro de
`tablero.ts`/`.html`/`.css`, igual que ya vivía el interruptor de la spec 041. Eso llevó
`tablero.css` a 9,41 kB, muy por encima del error duro de 8 kB — el fichero ya iba sobre el
aviso de 4 kB antes de esta spec. La solución no fue seguir recortando bytes a mano (ya se había
intentado en la spec 041 y dejaba poco margen), sino corregir la causa: sacar el dial a un
componente `ui/comun/knob.ts` reutilizable, y todo el contenido de la pestaña "Pintado" a
`ui/panel/panel-pintado.ts` — exactamente el mismo patrón que ya usaba `PanelAjustes` para la
pestaña "Ajustes", que esta spec debería haber seguido desde el principio en vez de replicar el
atajo de la 041 de dejarlo todo inline en `Tablero`. El resultado no es solo un presupuesto que
cuadra: `Tablero` deja de saber cómo se dibuja un dial o una franja de radio de dos iconos, que
es justo la separación que ya tenían `PanelEnsenanza` y `PanelAjustes`.

**El interruptor on/off de la spec 041 (`pintadoActivo`) se retira, no se deja en desuso.** Se
sustituyó de raíz por `accionArrastre: 'pintar' | 'mover'` en `SistemaStore`, con el mismo
comportamiento subyacente (E1-E4 son, en la práctica, el mismo mecanismo de la 041 E2-E4/E11-E12
con una interfaz que dice las dos cosas que puede hacer el arrastre, no solo si está "activado").
No quedó ningún rastro del nombre ni del método antiguos en `application/`, `ui/tablero/` ni
`ui/pista/`.

**`ANCHO_BLOQUEADOR` no se tocó**, tal y como fijaron las preguntas abiertas: el dial escala
`puntosSvg()` en `ui/pista/pista.ts` sobre el polígono ya calculado por `sombraDeBloqueo`,
anclado al punto medio de los vértices con menor `y` (el lado que toca la red). `domain/` no
sabe que el dial existe.

**Lo que no se desvió:** las decisiones cerradas al congelar la spec (ancla de la red, dial
puramente de pantalla, selector defensa/finta conservado) se implementaron tal cual.
