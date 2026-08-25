import { describe, expect, it } from 'vitest';
import { DISTANCIA_MINIMA_ENTRE_JUGADORES, separarDeOtros } from './separacion';

describe('separarDeOtros', () => {
  it('sin nadie cerca, el punto no se mueve', () => {
    const resultado = separarDeOtros({ x: 4.5, y: 4.5 }, [{ x: 0, y: 0 }], 0.9);

    expect(resultado).toEqual({ x: 4.5, y: 4.5 });
  });

  it('demasiado cerca de otro, se aparta hasta quedar justo a la distancia mínima', () => {
    const resultado = separarDeOtros({ x: 4.6, y: 4.5 }, [{ x: 4.5, y: 4.5 }], 0.9);

    expect(Math.hypot(resultado.x - 4.5, resultado.y - 4.5)).toBeCloseTo(0.9, 6);
  });

  it('exactamente encima de otro (distancia cero) se aparta hacia la derecha', () => {
    const resultado = separarDeOtros({ x: 4.5, y: 4.5 }, [{ x: 4.5, y: 4.5 }], 0.9);

    expect(resultado).toEqual({ x: 5.4, y: 4.5 });
  });

  it('ya a la distancia mínima exacta, no se mueve más', () => {
    const resultado = separarDeOtros({ x: 5.4, y: 4.5 }, [{ x: 4.5, y: 4.5 }], 0.9);

    expect(resultado).toEqual({ x: 5.4, y: 4.5 });
  });

  it('cerca de dos a la vez, se aparta de los dos', () => {
    const resultado = separarDeOtros(
      { x: 4.5, y: 4.5 },
      [
        { x: 4.6, y: 4.5 },
        { x: 4.4, y: 4.5 },
      ],
      0.9,
    );

    expect(Math.hypot(resultado.x - 4.6, resultado.y - 4.5)).toBeGreaterThanOrEqual(0.9 - 1e-6);
    expect(Math.hypot(resultado.x - 4.4, resultado.y - 4.5)).toBeGreaterThanOrEqual(0.9 - 1e-6);
  });

  it('sin otros jugadores, el punto no se mueve', () => {
    const resultado = separarDeOtros({ x: 1, y: 1 }, [], 0.9);

    expect(resultado).toEqual({ x: 1, y: 1 });
  });

  it('DISTANCIA_MINIMA_ENTRE_JUGADORES no abre un pasillo de luz en la sombra de bloqueo', () => {
    // Referencia de la spec 040 (sombra-bloqueo.ts): ANCHO_BLOQUEADOR 0.4 + HOLGURA_VANO 0.6 =
    // 1 m sigue fusionando. La distancia mínima entre jugadores debe quedar por debajo de eso.
    const ANCHO_BLOQUEADOR = 0.4;
    const HOLGURA_VANO = 0.6;

    expect(DISTANCIA_MINIMA_ENTRE_JUGADORES).toBeLessThanOrEqual(ANCHO_BLOQUEADOR + HOLGURA_VANO);
  });
});
