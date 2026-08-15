import { describe, expect, it } from 'vitest';
import type { Punto } from './modelos';
import { viaDeAtaque } from './defensa';

describe('viaDeAtaque', () => {
  it('E3: un punto en el tercio derecho del campo rival, delante de su línea de ataque, es zona 4', () => {
    const punto: Punto = { x: 7.5, y: -1.5 };

    expect(viaDeAtaque(punto)).toBe('z4');
  });

  it('E4: un punto en el tercio central del campo rival, delante de su línea de ataque, es zona 3', () => {
    const punto: Punto = { x: 4.5, y: -1.5 };

    expect(viaDeAtaque(punto)).toBe('z3');
  });

  it('E5: un punto en el tercio izquierdo del campo rival, delante de su línea de ataque, es zona 2', () => {
    const punto: Punto = { x: 1.5, y: -1.5 };

    expect(viaDeAtaque(punto)).toBe('z2');
  });

  it('E6: un punto detrás de la línea de ataque rival es pipe, aunque esté alineado con el tercio central', () => {
    const punto: Punto = { x: 4.5, y: -3.5 };

    expect(viaDeAtaque(punto)).toBe('pipe');
  });
});
