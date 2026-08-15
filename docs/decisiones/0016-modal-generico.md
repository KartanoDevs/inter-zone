# 0016 — Un componente `Modal` genérico sustituye a las implementaciones paralelas de diálogo

**Estado:** Aceptada

**Contexto.** Antes de esta decisión había tres implementaciones distintas de "overlay + tarjeta
+ cierre" en `ui/`: las clases globales `.app-dialogo*` (usadas por `DialogoConfirmacion` y
`DialogoSistema`), y una tercera implementación paralela solo para la leyenda de `Pista`
(`.app-pista__leyenda-*`, con su propio `max-width`, su propio botón "Cerrar" duplicando
`.app-boton--terciario` a mano, y sin cierre con `Escape`). Cada diálogo nuevo (edición de texto
de enseñanza, ajustes de líbero y validación) habría añadido una cuarta variante si se seguía el
mismo patrón.

**Decisión.** `ui/comun/modal.ts` (`app-modal`) es un componente de presentación puro: overlay,
tarjeta, cabecera con título y botón "×", cuerpo y acciones proyectados por `<ng-content>`, cierre
por click fuera, por la "×" o con `Escape`. Un input `variante` (`normal` | `alerta`) cubre el
único caso de personalización real que existía (el borde rosa de `DialogoConfirmacion`). Se migró
a él la leyenda de `Pista`, `DialogoConfirmacion`, `DialogoSistema`, el nuevo popup de edición de
`PanelEnsenanza` (que antes intercambiaba el párrafo por un `<textarea>` inline) y el nuevo
`DialogoAjustes`.

**Decisión relacionada.** `.app-boton--terciario` se retira en favor de `.app-boton--secundario`,
con el aspecto pedido en `docs/voley/Ejemplo botones.png` (borde cerrado, gris-azulado). El
`clip-path` de esquinas facetadas cortaba un `border` normal en las dos diagonales, dejándolo
abierto ahí; se sustituyó por el propio fondo del botón haciendo de color de borde, con un
`::before` recortado 1px hacia dentro pintando el relleno — como los dos usan el mismo
`clip-path`, la franja de 1px entre ambos rodea el botón entero, diagonales incluidas.

**Consecuencias.** Ningún diálogo de `ui/` vuelve a reimplementar overlay o lógica de cierre por
su cuenta; añadir uno nuevo es proyectar contenido en `<app-modal>`. Los tres diálogos migrados
ganan cierre con `Escape`, que ninguno tenía antes. `dialogo-confirmacion.css` se reduce a la
variante de color, porque el resto (overlay, tarjeta, título, acciones) ya lo resuelve `Modal`.
