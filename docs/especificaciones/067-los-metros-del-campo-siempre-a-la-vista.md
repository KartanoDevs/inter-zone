# 067 — Los metros del campo, siempre a la vista

**Estado:** Congelada
**Paso de la hoja de ruta:** No encaja en ninguno: es un ajuste de presentación de la pista.

## Problema

Los números de metros junto a la rejilla (0, 1, 2… a la izquierda de la pista) solo aparecen en
el Editor, y solo si el entrenador activa a mano el ajuste "Mostrar números de metros junto a la
rejilla", que nace apagado. En Teoría y en el Examen no hay forma de verlos. Un jugador que
estudia una recepción o se examina no tiene ninguna referencia de dónde cae cada metro del
campo.

## Objetivo

Los números de metros se ven siempre —en Edición, Teoría y Examen, para todo el mundo—, sin
ajuste que los controle.

## Fuera de alcance

- **Cambiar cómo se dibujan los números** (tamaño, posición, cuántos). Es exactamente el mismo
  dibujo que hoy hace el Editor cuando el ajuste está activo.
- **Otros ajustes del panel.** "Desactivar validación", "Ocultar ayuda de posición" y "Orden de
  rotación" siguen igual, con su interruptor.
- **La rejilla en sí.** Solo se toca si se pintan o no los números al lado.
- **Una regla o escala arrastrable.** Son los números fijos que ya existen.

## Escenarios

**E1 — Los números de metros se ven en el Editor sin tocar nada**
- Dado: la aplicación recién abierta, sin ajustes guardados
- Cuando: se entra en el Editor
- Entonces: los números de metros aparecen junto a la rejilla

**E2 — Los números de metros se ven en Teoría**
- Dado: cualquier cuenta
- Cuando: abre la pestaña Teoría
- Entonces: los números de metros aparecen junto a la rejilla

**E3 — Los números de metros se ven en el Examen**
- Dado: un examen en curso
- Cuando: se mira la pista
- Entonces: los números de metros aparecen junto a la rejilla

**E4 — Ya no existe el ajuste "Mostrar números de metros"**
- Dado: el panel de Ajustes del Editor
- Cuando: se mira su lista de interruptores
- Entonces: no hay ninguna fila para mostrar u ocultar los números de metros

**E5 — Un navegador con el ajuste guardado en `false` también los ve**
- Dado: un navegador que guardó los ajustes con "Mostrar números de metros" apagado
- Cuando: se abre la aplicación tras este cambio
- Entonces: los números de metros se ven igual — el valor guardado antiguo se descarta

## Preguntas abiertas

Ninguna. Resueltas con el usuario antes de congelar:

- **Se elimina el ajuste por completo** (E4): el campo del repositorio de ajustes, el método del
  store, la fila del panel y el `input` de la pista que lo condicionaba.
- **Se fuerza el cambio para todos** (E5): se sube la versión del payload de ajustes en
  `localStorage`, igual que cuando cambió `escalaSombra` (versión 6). Cualquier ajuste guardado
  antes se descarta y se vuelve a los valores por defecto.

## Al cerrar

Los 5 escenarios se cumplen. Suite: 517 → 518 — el nuevo está en
`infrastructure/local-storage-ajustes.repository.spec.ts` (E5: un payload versión 6 se
descarta). E1-E4 son render puro y borrado de código; verificados con `npm run build` y
revisión. `npm run typecheck`, `npm run build` y `npm run format:check` limpios.

**Se borró el ajuste entero, no solo su valor por defecto:** el campo `mostrarNumerosMetros` de
`Ajustes` (`domain/puertos.ts`), su validación y su valor en `local-storage-ajustes.repository`,
la `signal` + `alternarMostrarNumerosMetros` + la línea de `guardarAjustes` en `SistemaStore`, el
`input` `mostrarNumerosMetros` de `Pista`, el `input`/`output` de `PanelAjustes`, la fila del
panel, y el método puente + los dos bindings de `Tablero`. En `pista.html` el `@if` desaparece:
el `<g>` de los números se pinta siempre.

**Payload de ajustes a versión 7.** Un documento de la versión 6 lleva `mostrarNumerosMetros` de
más y `esPayloadValido` ya no lo espera, así que cualquier ajuste guardado antes de este cambio
se descarta y se vuelve a los valores por defecto — que ya no incluyen forma de ocultar los
números. Mismo mecanismo que usó la 044 (v4→v5) y la 045 (v5→v6).

**Teoría y Examen no necesitaron tocarse:** nunca pasaban `mostrarNumerosMetros` a `<app-pista>`,
así que en cuanto el `@if` del componente se fue, los números aparecen ahí solos.

**Sin ADR nuevo ni cambio en `docs/dominio.md`:** es presentación de la pista, no una regla de
voleibol. Sí se toca `docs/arquitectura.md` (ADR 0027): la lista de banderas de `Ajustes` y la
versión del payload.

**Lo que no se desvió:** nada. El borrado salió limpio, sin ningún consumidor huérfano.
