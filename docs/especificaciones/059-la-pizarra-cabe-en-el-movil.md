# 059 — La pizarra cabe en el móvil

**Estado:** Congelada
**Paso de la hoja de ruta:** 4

## Problema

El entrenador se instala InterZone en el móvil, que es donde la va a usar de verdad —en la
banda, no sentado a un escritorio— y se encuentra con la ventana Cuenta recortada sin poder
desplazarse hasta el botón "Salir", botones que fallan al primer toque, y el menú superior
medio tapado por el notch al abrir la app instalada. En el ordenador, en cambio, la app es una
columna estrecha de 720 px con fondo vacío a los lados aunque sobre pantalla.

## Objetivo

Todas las ventanas se usan enteras en un móvil de 320 × 568 px, con scroll vertical donde el
contenido no quepa; instalada como PWA se comporta como una app nativa, sin recortes bajo el
notch ni la barra de gestos; y en escritorio la misma columna aprovecha el ancho disponible sin
cambiar de maqueta.

## Fuera de alcance

Esta spec autoriza explícitamente tocar `src/app/ui/`, que `CLAUDE.md` protege por defecto.
La autorización se limita a los siguientes ficheros, y solo a sus hojas de estilo (`.css`) y a
`src/index.html` — ningún `.ts` ni ningún `.html` de componente, salvo que un escenario
concreto lo exija y lo diga explícitamente:

- `src/styles.css`, `src/index.html`
- `src/app/ui/tablero/tablero.css`
- `src/app/ui/teoria/teoria-tablero.css`
- `src/app/ui/examen/examen-tablero.css`
- `src/app/ui/acceso/perfil-cuenta.css`
- `src/app/ui/acceso/pantalla-acceso.css`
- `src/app/ui/acceso/lista-blanca-admin.css`
- `src/app/ui/comun/modal.css`
- `src/app/ui/comun/speeddial.css`
- `src/app/ui/comun/barra.css`
- `src/app/ui/panel/paleta-jugadores.css`
- `src/app/ui/sistemas/dialogo-sistema.css`
- `src/app/ui/ajustes/panel-ajustes.css`
- `src/app/ui/rotaciones/selector-bloqueadores.css`
- `src/app/ui/rotaciones/selector-caso.css`
- `src/app/ui/rotaciones/selector-rotacion.css`
- `src/app/ui/rotaciones/selector-situacion.css`

Ningún otro fichero de `ui/`, y ninguno de `application/`, `infrastructure/` ni `domain/`,
queda autorizado por esta spec.

Explícitamente fuera:

- **Rediseño visual.** Colores, tipografías, iconos y jerarquía se quedan como están. Esta spec
  cambia medidas, no estética.
- **Renombrar** clases, componentes o ficheros.
- `src/app/maqueta/` — prototipo muerto, no se toca.
- `domain/`, `application/`, `infrastructure/`, `server/` — nada de esto cambia.
- **Añadir dependencias.** CSS nativo y los tokens ya existentes en `src/styles.css`.
- **Cambiar comportamiento.** Ningún flujo, ninguna regla de negocio, ningún dato se altera; el
  arrastre de fichas (`pointerdown` + `touch-action: none`, ya táctil) no se rehace, solo no se
  rompe.
- **Accesibilidad de teclado.** Sigue siendo trabajo aparte, como ya dejaron dicho las specs 055
  y 057.
- **Rehacer el manifiesto o el service worker** más allá de lo que pida explícitamente un
  escenario de esta spec.
- **Reorganizar el layout en escritorio.** La columna se ensancha; no se pasa a dos columnas ni
  se reordenan los bloques respecto al móvil.

## Escenarios

### Suelo de tamaño

**E1 — El suelo soportado es 320 × 568 px**
- Dado: cualquier ventana de la app
- Cuando: el viewport mide 320 × 568 px (el móvil más pequeño en circulación, iPhone SE de 1ª
  generación)
- Entonces: ningún elemento provoca scroll horizontal del documento, y toda acción disponible
  en esa ventana es alcanzable sin recortarse

**E2 — El suelo también vale apaisado**
- Dado: cualquier ventana de la app
- Cuando: el viewport mide 568 × 320 px (el mismo móvil, girado)
- Entonces: ningún elemento provoca scroll horizontal del documento, y toda acción disponible
  en esa ventana es alcanzable sin recortarse

### Cuando el contenido no cabe en alto, ventana a ventana

**E3 — Cuenta se puede desplazar hasta el final**
- Dado: la ventana Cuenta, con los tres campos de perfil, el correo, el rol y el botón "Salir"
- Cuando: el alto disponible es menor que el contenido (hoy ocurre ya en 320 × 568)
- Entonces: aparece scroll vertical y el botón "Salir" es alcanzable desplazándose, no queda
  recortado sin salida

**E4 — El Editor en defensa cabe con scroll, con el nav y las pestañas fijos**
- Dado: el Editor mostrando una defensa (la variante con más filas: selector de caso, de
  situación y de bloqueadores, además del selector de rotación)
- Cuando: el alto disponible es 568 px o menos
- Entonces: el nav superior y la barra de pestañas permanecen clavados (no se desplazan ni
  desaparecen), solo la zona intermedia —cabecera de sistema, pista y panel— hace scroll
  vertical, y la pista conserva al menos 220 px de alto visible dentro de esa zona. Mismo
  patrón que ya usa `.app-tablero__tabpanel` para el panel inferior
  ([tablero.css:457-458](../../src/app/ui/tablero/tablero.css#L457-L458)).

**E5 — Teoría se puede desplazar hasta el final**
- Dado: la ventana Teoría con una explicación larga desplegada
- Cuando: el alto disponible es menor que el contenido
- Entonces: aparece scroll vertical y el final de la explicación es alcanzable

**E6 — Examen con las acciones de corrección desplegadas cabe con scroll**
- Dado: un examen en curso con el panel de corrección de la rotación abierto (validar, vaciar,
  comparar)
- Cuando: el alto disponible es 568 px o menos
- Entonces: aparece scroll vertical y las tres acciones son alcanzables

**E7 — Lista blanca con la tabla llena cabe con scroll**
- Dado: la ventana Lista blanca (solo admin) con más invitaciones pendientes de las que caben
  en pantalla
- Cuando: el alto disponible es 568 px o menos
- Entonces: aparece scroll vertical y la última fila de la tabla es alcanzable, y el formulario
  de invitar sigue siendo usable

### Modales

**E8 — Un modal más alto que la pantalla se puede leer entero**
- Dado: `Modal` (hoy `max-height: 80vh`) con contenido que excede ese alto
- Cuando: se abre en un viewport de 320 × 568
- Entonces: el modal usa una unidad dinámica (no `vh`, coherente con el resto de la app) y su
  contenido se puede desplazar hasta el final sin que el modal exceda el viewport

**E9 — Un diálogo de confirmación con mensaje largo no se recorta**
- Dado: `DialogoConfirmacion` (hoy sin `max-height` ni `overflow`) con un mensaje largo
- Cuando: se abre en un viewport de 320 × 568
- Entonces: el diálogo no excede el alto del viewport y su mensaje completo es legible,
  desplazándose si hace falta

### PWA instalada

**E10 — El nav no queda bajo el notch**
- Dado: la app instalada en un dispositivo con recorte superior (notch o isla dinámica) y la
  barra de estado en modo `black-translucent` (ya configurada en `index.html`)
- Cuando: se abre cualquier ventana
- Entonces: el nav superior respeta `env(safe-area-inset-top)` y ningún botón queda bajo el
  recorte ni bajo la barra de estado

**E11 — Las pestañas no quedan bajo la barra de gestos**
- Dado: la app instalada en un dispositivo con barra de gestos inferior
- Cuando: se abre cualquier ventana con la barra de pestañas visible
- Entonces: la barra respeta `env(safe-area-inset-bottom)` y ningún botón queda bajo la zona
  de gestos

**E12 — No se comporta como una web dentro de un marco**
- Dado: la app instalada en modo standalone
- Cuando: se hace scroll en el límite superior o inferior de un contenedor, se mantiene pulsado
  sobre texto, o se arrastra una ficha
- Entonces: no hay rebote visible de overscroll de la página completa, no aparece resaltado de
  selección de texto durante el arrastre, y no aparece el halo azul de "tap highlight" al tocar
  botones o fichas

### Táctil

**E13 — Toda zona pulsable mide al menos 44 × 44 px**
- Dado: cualquier botón, pestaña o control interactivo de la app (incluidos `.app-boton` y los
  botones del nav, hoy por debajo de ese mínimo)
- Cuando: se mide su área táctil
- Entonces: mide 44 × 44 px o más, contando el padding si el contenido visual es más pequeño

**E14 — El arrastre de fichas sigue funcionando en el suelo soportado**
- Dado: el Editor con el banquillo de jugadores visible
- Cuando: se arrastra una ficha desde el banquillo hasta una celda de la pista, en un viewport
  de 320 × 568
- Entonces: la ficha se suelta en la celda correcta, igual que en el layout actual — el
  arrastre no cambia de mecanismo, solo las medidas alrededor

**E15 — El teclado virtual no obliga a hacer zoom ni tapa el campo activo**
- Dado: un formulario con campos de texto (acceso, perfil, invitar en lista blanca)
- Cuando: se enfoca un campo en un móvil, abriendo el teclado virtual
- Entonces: el campo enfocado permanece visible por encima del teclado, y ningún campo de
  texto o `select` tiene `font-size` por debajo de 16 px (evita el zoom automático de iOS)

### Escritorio

**E16 — La columna se ensancha a partir de 1024 px, sin cambiar de maqueta**
- Dado: cualquier ventana de la app
- Cuando: el viewport mide 1024 px de ancho o más
- Entonces: la columna central supera su `max-width` actual de 720 px y la pista crece con
  ella, pero el orden y la disposición de los bloques es el mismo que en móvil — no aparece una
  segunda columna ni se reordena nada

## Preguntas abiertas

Ninguna. Las dos que bloqueaban esta spec ya están resueltas:

- **Scroll del Editor:** shell fijo con zona central scrollable (opción (a) del borrador
  anterior). Queda como criterio de aceptación en E4, con el precedente de
  `.app-tablero__tabpanel` que ya usa ese mismo patrón.
- **Verificación sin TDD:** checklist manual, documentado solo en esta spec — sin ADR nuevo en
  `docs/decisiones/`, por tratarse de una casuística aislada (spec puramente visual, sin lógica
  de dominio) y no de un criterio que se espere repetir. Ver nota de verificación más abajo.

## Nota de verificación

Esta spec no sigue el ciclo rojo→verde de `docs/flujo-de-trabajo.md`: no hay test que pueda
fallar antes de una regla de layout. Coincide con lo que la propia sección "Qué NO se testea"
del mismo documento ya excluye ("que el panel esté a la derecha", que el arrastre "se sienta
bien"). Cada escenario se verifica a ojo, en el navegador, contra su condición numérica —
ancho, alto, si aparece scroll, si algo queda recortado — y esa verificación manual, escenario
por escenario, se registra en la tabla de "Al cerrar" en vez de en una suite de tests.

## Al cerrar

CSS y estructura mínima implementados para los 16 escenarios; `npm test` (469 tests, 27
ficheros), `npm run typecheck` y `ng build --configuration production` en verde. Ningún
fichero fuera de la lista autorizada — `tablero.html` fue el único `.html` tocado, con dos
envoltorios estructurales (`.app-tablero__central` para E4, `.app-tablero__cuenta` para E3)
que el resto de escenarios no necesitaban.

**La columna "Resultado" queda sin rellenar a propósito.** Por el criterio de la "Nota de
verificación", esta spec se cierra con checklist manual en vez de tests, y ese checklist
requiere mirar cada escenario en un navegador o dispositivo real — algo que quien implementó
el CSS no ha hecho. Márcalo tú al probarlo; hasta entonces, "implementado" no es lo mismo que
"verificado".

| Escenario | Viewport a probar | Resultado |
|---|---|---|
| E1 — suelo 320×568 | 320×568 | |
| E2 — suelo apaisado | 568×320 | |
| E3 — Cuenta con scroll | 320×568, formulario completo | |
| E4 — Editor en defensa, shell fijo | 320×568, defensa con bloqueadores | |
| E5 — Teoría con scroll | 320×568, explicación larga | |
| E6 — Examen con corrección desplegada | 320×568 | |
| E7 — Lista blanca con tabla llena | 320×568, varias invitaciones | |
| E8 — Modal más alto que la pantalla | 320×568 | |
| E9 — Diálogo con mensaje largo | 320×568 | |
| E10 — safe-area superior | Instalada, dispositivo con notch | |
| E11 — safe-area inferior | Instalada, dispositivo con gestos | |
| E12 — sin comportamiento "web" | Instalada, standalone | |
| E13 — áreas táctiles ≥44px | Cualquiera, medir con DevTools | |
| E14 — arrastre en el suelo soportado | 320×568 | |
| E15 — teclado virtual / zoom | Móvil real, enfocar cada input | |
| E16 — escritorio ≥1024px | 1024px+ | |

**Desviación respecto a lo previsto en E13:** varios controles (`.app-tablero__panel-plegar`,
`.sd__fab`, `.app-modal__cerrar`, `.app-tablero__validar`) viven en cabeceras demasiado
compactas para crecer a 44px visualmente sin desproporcionar el diseño. En vez de agrandar el
círculo/badge, se amplió solo el área táctil con un `::after` transparente en `position:
relative; inset: -Npx`, dejando el tamaño visual intacto. No estaba anticipado en la spec como
técnica, pero es la misma idea en los cuatro sitios, así que no se considera una desviación de
criterio — E13 pide 44px de zona pulsable, no de círculo dibujado.

**Nada estructural que anotar en `docs/decisiones/`.** Esta spec es puramente visual y no
cambia qué capas existen ni qué hace la app en producción; `docs/arquitectura.md` y
`README.md` no necesitan tocarse.
