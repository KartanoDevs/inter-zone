import type { Punto } from './modelos';

export type DireccionAjuste = 'arriba' | 'abajo' | 'izquierda' | 'derecha';

/** Paso de cada pulsación de flecha en el ajuste fino de una ficha (spec 070). */
export const PASO_AJUSTE_FINO = 0.1;

// Mismos límites que `LIMITE_X`/`LIMITE_Y` de `ui/tablero/tablero.ts`: el campo propio, 9x9 m.
// No se importan de allí (esa capa no la importa `domain/`) ni se mueven — se redeclaran aquí
// con los mismos valores, a propósito, según lo acordado al corregir la spec 070.
const LIMITE_CAMPO: readonly [number, number] = [0, 9];

// Redondeado a milímetros: sin esto, acumular pasos de 0,1 m arrastra el error de coma
// flotante habitual (0,1 + 0,1 + 0,1 !== 0,3) tras unas pocas pulsaciones. 0,001 m queda muy
// por debajo del margen ε = 0,05 m de las faltas posicionales (`docs/dominio.md` §5), así que
// nunca cambia si una posición es legal.
function acotar(valor: number): number {
  const redondeado = Math.round(valor * 1000) / 1000;
  return Math.min(LIMITE_CAMPO[1], Math.max(LIMITE_CAMPO[0], redondeado));
}

export function aplicarPaso(punto: Punto, direccion: DireccionAjuste): Punto {
  switch (direccion) {
    case 'arriba':
      return { x: punto.x, y: acotar(punto.y - PASO_AJUSTE_FINO) };
    case 'abajo':
      return { x: punto.x, y: acotar(punto.y + PASO_AJUSTE_FINO) };
    case 'izquierda':
      return { x: acotar(punto.x - PASO_AJUSTE_FINO), y: punto.y };
    case 'derecha':
      return { x: acotar(punto.x + PASO_AJUSTE_FINO), y: punto.y };
  }
}
