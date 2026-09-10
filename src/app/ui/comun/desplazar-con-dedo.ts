/**
 * Desplaza `contenedor` verticalmente siguiendo un gesto de arrastre, para usarse sobre
 * elementos con `touch-action: none` (como el `<svg>` de `Pista`) donde el navegador nunca
 * convierte el gesto en scroll nativo. Mismo patrón de listeners que `Tablero.iniciarArrastre`
 * y `Barra.iniciarArrastre`: se registran en `window` para no perder el gesto si el puntero
 * sale del elemento, y se limpian al soltar o cancelar.
 */
export function desplazarConElDedo(evento: PointerEvent, contenedor: HTMLElement): void {
  let anteriorY = evento.clientY;

  const mover = (e: PointerEvent): void => {
    contenedor.scrollTop -= e.clientY - anteriorY;
    anteriorY = e.clientY;
  };
  const soltar = (): void => {
    window.removeEventListener('pointermove', mover);
    window.removeEventListener('pointerup', soltar);
    window.removeEventListener('pointercancel', soltar);
  };

  window.addEventListener('pointermove', mover);
  window.addEventListener('pointerup', soltar);
  window.addEventListener('pointercancel', soltar);
}
