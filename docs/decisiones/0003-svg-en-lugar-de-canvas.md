# 0003 — SVG en lugar de Canvas y Fabric.js

**Estado:** Aceptada

**Contexto.** La propuesta inicial usaba Fabric.js sobre Canvas, con un patrón Adapter para
desacoplar Angular de la librería.

**Decisión.** SVG nativo, renderizado desde signals. Sin Fabric.js y sin adaptador de
renderizado.

**Consecuencias.** El responsive sale gratis con `viewBox`. Los elementos están en el DOM:
estilables con CSS, inspeccionables y accesibles. Al derivarse el SVG del estado, desaparece
el problema de sincronizar dos representaciones, que era lo que el adaptador venía a
resolver. A cambio, si algún día hace falta dibujo libre a mano alzada, capas o texto
editable, habrá que reevaluar: ahí Canvas gana.
