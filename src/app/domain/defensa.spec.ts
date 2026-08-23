import { describe, expect, it } from 'vitest';
import type { Punto } from './modelos';
import { situacionMasCercana, situacionTrasCambioDeCaso, situacionesDe } from './defensa';

describe('situacionesDe', () => {
  it('E3: con el colocador rival delantero hay cinco situaciones, sin ataque por 2', () => {
    expect(situacionesDe('delantero')).toEqual(['inicial', 'z4', 'z3', 'pipe', 'z1']);
  });

  it('E4: con el colocador rival trasero hay cinco situaciones distintas, sin ataque por 1', () => {
    expect(situacionesDe('trasero')).toEqual(['inicial', 'z4', 'z3', 'z2', 'pipe']);
  });
});

describe('situacionTrasCambioDeCaso', () => {
  it('E5: cambiar de caso cae en la inicial si la situación activa no existe en el nuevo caso', () => {
    expect(situacionTrasCambioDeCaso('z1', 'trasero')).toBe('inicial');
  });

  it('E5 (contraejemplo): cambiar de caso conserva la situación si sigue existiendo', () => {
    expect(situacionTrasCambioDeCaso('z4', 'trasero')).toBe('z4');
  });
});

describe('situacionMasCercana', () => {
  it('E9: soltar el atacante en el tercio de nuestra derecha del campo rival da la situación z4', () => {
    const punto: Punto = { x: 7.5, y: -1.5 };

    expect(situacionMasCercana(punto, 'trasero')).toBe('z4');
  });

  it('E10: con el colocador delantero, soltar sobre la zona 2 rival cae en la situación válida más cercana, no en z2', () => {
    const punto: Punto = { x: 1.5, y: -1.5 }; // zona 2 rival: nuestra izquierda, x bajo

    expect(situacionMasCercana(punto, 'delantero')).not.toBe('z2');
    expect(situacionesDe('delantero')).toContain(situacionMasCercana(punto, 'delantero'));
  });
});
