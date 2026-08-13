import { describe, expect, it } from 'vitest';
import type { Jugador, OrdenSaque } from './modelos';
import { formacionEnRotacion, rotacionDe, rotar } from './rotacion';

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

describe('formacionEnRotacion', () => {
  it('003-E1: el colocador ya está en P1, R1 es el propio orden de saque', () => {
    const colocador = jugador('p1', 'colocador');
    const p2 = jugador('p2', 'opuesto');
    const p3 = jugador('p3', 'central');
    const p4 = jugador('p4', 'receptor');
    const p5 = jugador('p5', 'central');
    const p6 = jugador('p6', 'receptor');
    const orden: OrdenSaque = [colocador, p2, p3, p4, p5, p6];

    const resultado = formacionEnRotacion(orden, 1);

    expect(resultado).toEqual(orden);
  });

  it('003-E2: el colocador está en P4, R1 lo mueve a P1', () => {
    const p1 = jugador('p1', 'receptor');
    const p2 = jugador('p2', 'central');
    const p3 = jugador('p3', 'opuesto');
    const colocador = jugador('p4', 'colocador');
    const p5 = jugador('p5', 'central');
    const p6 = jugador('p6', 'receptor');
    const orden: OrdenSaque = [p1, p2, p3, colocador, p5, p6];

    const resultado = formacionEnRotacion(orden, 1);

    expect(resultado[0]).toBe(colocador);
  });

  it('003-E3: pedir R3 coloca al colocador en P3', () => {
    const p1 = jugador('p1', 'receptor');
    const p2 = jugador('p2', 'central');
    const colocador = jugador('p3', 'colocador');
    const p4 = jugador('p4', 'opuesto');
    const p5 = jugador('p5', 'central');
    const p6 = jugador('p6', 'receptor');
    const orden: OrdenSaque = [p1, p2, colocador, p4, p5, p6];

    const resultado = formacionEnRotacion(orden, 3);

    expect(resultado[2]).toBe(colocador);
  });

  it('003-E4: las seis rotaciones cubren las seis posiciones del colocador sin repetir', () => {
    const p1 = jugador('p1', 'receptor');
    const colocador = jugador('p2', 'colocador');
    const p3 = jugador('p3', 'central');
    const p4 = jugador('p4', 'opuesto');
    const p5 = jugador('p5', 'central');
    const p6 = jugador('p6', 'receptor');
    const orden: OrdenSaque = [p1, colocador, p3, p4, p5, p6];

    const posicionesDelColocador = [1, 2, 3, 4, 5, 6].map(
      (rotacion) => formacionEnRotacion(orden, rotacion).indexOf(colocador) + 1,
    );

    expect(new Set(posicionesDelColocador)).toEqual(new Set([1, 2, 3, 4, 5, 6]));
  });

  it('003-E5: rotar seis veces devuelve el orden de partida', () => {
    const p1 = jugador('p1', 'receptor');
    const colocador = jugador('p2', 'colocador');
    const p3 = jugador('p3', 'central');
    const p4 = jugador('p4', 'opuesto');
    const p5 = jugador('p5', 'central');
    const p6 = jugador('p6', 'receptor');
    const orden: OrdenSaque = [p1, colocador, p3, p4, p5, p6];

    const r1 = formacionEnRotacion(orden, 1);

    expect(rotar(r1, 6)).toEqual(r1);
  });

  it('003-E6: un orden de saque sin colocador se rechaza', () => {
    const p1 = jugador('p1', 'receptor');
    const p2 = jugador('p2', 'receptor');
    const p3 = jugador('p3', 'central');
    const p4 = jugador('p4', 'opuesto');
    const p5 = jugador('p5', 'central');
    const p6 = jugador('p6', 'receptor');
    const orden: OrdenSaque = [p1, p2, p3, p4, p5, p6];

    expect(() => formacionEnRotacion(orden, 1)).toThrow();
  });

  it('003-E7: identifica en qué rotación está una formación dada', () => {
    const p1 = jugador('p1', 'receptor');
    const colocador = jugador('p2', 'colocador');
    const p3 = jugador('p3', 'central');
    const p4 = jugador('p4', 'opuesto');
    const p5 = jugador('p5', 'central');
    const p6 = jugador('p6', 'receptor');
    const orden: OrdenSaque = [p1, colocador, p3, p4, p5, p6];
    const r4 = formacionEnRotacion(orden, 4);

    expect(rotacionDe(r4)).toBe(4);
  });
});
