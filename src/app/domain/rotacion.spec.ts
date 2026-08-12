import { describe, expect, it } from 'vitest';
import type { Jugador, OrdenSaque } from './modelos';
import { rotar } from './rotacion';

function jugador(id: string, rol: Jugador['rol']): Jugador {
  return { id, rol };
}

describe('rotar', () => {
  it('E16: seis rotaciones vuelven al orden de partida', () => {
    const p1 = jugador('p1', 'opuesto');
    const p2 = jugador('p2', 'colocador');
    const p3 = jugador('p3', 'central');
    const p4 = jugador('p4', 'receptor');
    const p5 = jugador('p5', 'central');
    const p6 = jugador('p6', 'receptor');
    const orden: OrdenSaque = [p1, p2, p3, p4, p5, p6];

    const resultado = rotar(orden, 6);

    expect(resultado).toEqual(orden);
  });
});
