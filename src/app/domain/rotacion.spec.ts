import { describe, expect, it } from 'vitest';
import type { Jugador, OrdenSaque, PlantillaEquipo } from './modelos';
import { PLANTILLA_GLOBAL } from './plantilla-global';
import {
  formacionEnRotacion,
  jugadoresEnPista,
  ORDEN_ROTACIONES,
  rotacionDe,
  rotar,
  sustitutosLiberoPorDefecto,
  zaguerosEnRotacion,
} from './rotacion';

function jugador(id: string, rol: Jugador['rol']): Jugador {
  return { id, rol };
}

function ordenConLibero(): OrdenSaque {
  return [
    jugador('colocador', 'colocador'),
    jugador('receptor1', 'receptor'),
    jugador('central1', 'central'),
    jugador('opuesto', 'opuesto'),
    jugador('receptor2', 'receptor'),
    jugador('central2', 'central'),
  ];
}

/** Mismo sustituto para las seis rotaciones — el caso de la spec 011, antes de que la 017
 * permitiera un valor distinto por rotación. Sigue siendo una plantilla válida: un mapa por
 * rotación con el mismo valor en las seis. */
function plantillaConLibero(sustituidoId: string): PlantillaEquipo {
  const sustitutosPorRotacion = {
    1: sustituidoId,
    2: sustituidoId,
    3: sustituidoId,
    4: sustituidoId,
    5: sustituidoId,
    6: sustituidoId,
  };
  return {
    nombre: 'Equipo A',
    ordenSaque: ordenConLibero(),
    libero: { jugador: jugador('libero', 'libero'), sustitutosPorRotacion },
  };
}

describe('ORDEN_ROTACIONES', () => {
  it('sigue el orden real de juego, no el numérico', () => {
    expect(ORDEN_ROTACIONES).toEqual([1, 6, 5, 4, 3, 2]);
  });
});

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

  it('003-E3 (revierte 019 por 020): pedir R3 coloca al colocador en P3', () => {
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

  it('020-E1: rotacionDe es la inversa exacta de formacionEnRotacion, para las seis', () => {
    const colocador = jugador('p1', 'colocador');
    const p2 = jugador('p2', 'opuesto');
    const p3 = jugador('p3', 'central');
    const p4 = jugador('p4', 'receptor');
    const p5 = jugador('p5', 'central');
    const p6 = jugador('p6', 'receptor');
    const orden: OrdenSaque = [colocador, p2, p3, p4, p5, p6];

    for (const rotacion of [1, 2, 3, 4, 5, 6]) {
      expect(rotacionDe(formacionEnRotacion(orden, rotacion))).toBe(rotacion);
    }
  });
});

describe('jugadoresEnPista', () => {
  it('011-E5: el líbero entra cuando el sustituido sería zaguero', () => {
    const plantilla = plantillaConLibero('central2');

    // R1: central2 ocupa P6 (zaguero) -> juega el líbero.
    const enR1 = jugadoresEnPista(plantilla, 1);

    expect(enR1.some((j) => j.id === 'libero')).toBe(true);
    expect(enR1.some((j) => j.id === 'central2')).toBe(false);
  });

  it('011-E6: el titular juega cuando le tocaría estar en delantera', () => {
    const plantilla = plantillaConLibero('central2');

    // R3: central2 ocupa P2 (delantero) -> juega el titular.
    const enR3 = jugadoresEnPista(plantilla, 3);

    expect(enR3.some((j) => j.id === 'central2')).toBe(true);
    expect(enR3.some((j) => j.id === 'libero')).toBe(false);
  });

  it('011-E7: el líbero está en pista en tres de las seis rotaciones', () => {
    const plantilla = plantillaConLibero('central2');

    const rotacionesConLibero = [1, 2, 3, 4, 5, 6].filter((rotacion) =>
      jugadoresEnPista(plantilla, rotacion).some((j) => j.id === 'libero'),
    );

    expect(rotacionesConLibero).toHaveLength(3);
  });

  it('011-E8: el líbero nunca ocupa P2, P3 ni P4', () => {
    const plantilla = plantillaConLibero('central2');

    for (const rotacion of [1, 2, 3, 4, 5, 6]) {
      const enPista = jugadoresEnPista(plantilla, rotacion);
      const indiceLibero = enPista.findIndex((j) => j.id === 'libero');
      if (indiceLibero !== -1) {
        expect([1, 2, 3]).not.toContain(indiceLibero);
      }
    }
  });

  it('sin líbero, juegan siempre los seis titulares', () => {
    const plantilla: PlantillaEquipo = {
      nombre: 'Equipo A',
      ordenSaque: [
        jugador('colocador', 'colocador'),
        jugador('receptor1', 'receptor'),
        jugador('central1', 'central'),
        jugador('opuesto', 'opuesto'),
        jugador('receptor2', 'receptor'),
        jugador('central2', 'central'),
      ],
    };

    expect(jugadoresEnPista(plantilla, 3)).toEqual(formacionEnRotacion(plantilla.ordenSaque, 3));
  });

  it('017-E5: con el sustituto por defecto (rotación a rotación), el líbero juega las seis rotaciones', () => {
    const orden = ordenConLibero();
    const plantilla: PlantillaEquipo = {
      nombre: 'Equipo A',
      ordenSaque: orden,
      libero: {
        jugador: jugador('libero', 'libero'),
        sustitutosPorRotacion: sustitutosLiberoPorDefecto(orden),
      },
    };

    const rotacionesConLibero = [1, 2, 3, 4, 5, 6].filter((rotacion) =>
      jugadoresEnPista(plantilla, rotacion).some((j) => j.id === 'libero'),
    );

    // A diferencia de la spec 011 (un único sustituto para las seis, líbero solo en tres),
    // con un sustituto por rotación el líbero juega las seis.
    expect(rotacionesConLibero).toHaveLength(6);
  });

  it('017-E6: elegir "ninguno" en una rotación deja jugando a los seis titulares en esa rotación, sin afectar a las demás', () => {
    const orden = ordenConLibero();
    const defecto = sustitutosLiberoPorDefecto(orden);
    const plantilla: PlantillaEquipo = {
      nombre: 'Equipo A',
      ordenSaque: orden,
      libero: {
        jugador: jugador('libero', 'libero'),
        sustitutosPorRotacion: { ...defecto, 1: null },
      },
    };

    const enR1 = jugadoresEnPista(plantilla, 1);
    expect(enR1.some((j) => j.id === 'libero')).toBe(false);
    expect(enR1).toEqual(formacionEnRotacion(orden, 1));

    // R3 conserva su sustituto por defecto: no se ve afectada por lo declarado en R1.
    const enR3 = jugadoresEnPista(plantilla, 3);
    expect(enR3.some((j) => j.id === 'libero')).toBe(true);
  });

  it('017-E7: elegir un titular que en esa rotación juega de delantero no mete al líbero en pista', () => {
    const orden = ordenConLibero();
    // central1 ocupa P3 (delantero) en R1 con este orden.
    const plantilla: PlantillaEquipo = {
      nombre: 'Equipo A',
      ordenSaque: orden,
      libero: {
        jugador: jugador('libero', 'libero'),
        sustitutosPorRotacion: { 1: 'central1', 2: null, 3: null, 4: null, 5: null, 6: null },
      },
    };

    const enR1 = jugadoresEnPista(plantilla, 1);

    expect(enR1.some((j) => j.id === 'libero')).toBe(false);
    expect(enR1.some((j) => j.id === 'central1')).toBe(true);
  });
});

describe('zaguerosEnRotacion', () => {
  it('los zagueros de una rotación son quienes ocupan P1, P5 y P6', () => {
    const colocador = jugador('p1', 'colocador');
    const p2 = jugador('p2', 'opuesto');
    const p3 = jugador('p3', 'central');
    const p4 = jugador('p4', 'receptor');
    const p5 = jugador('p5', 'central');
    const p6 = jugador('p6', 'receptor');
    const orden: OrdenSaque = [colocador, p2, p3, p4, p5, p6];

    const zagueros = zaguerosEnRotacion(orden, 1);

    expect(zagueros).toEqual([colocador, p5, p6]);
  });

  it('en las seis rotaciones, los zagueros son los de la tabla de referencia', () => {
    const orden = PLANTILLA_GLOBAL.ordenSaque;
    const idsPorRotacion = [1, 2, 3, 4, 5, 6].map(
      (rotacion) => new Set(zaguerosEnRotacion(orden, rotacion).map((j) => j.id)),
    );

    expect(idsPorRotacion[0]).toEqual(new Set(['colocador', 'receptor2', 'central1']));
    expect(idsPorRotacion[1]).toEqual(new Set(['central1', 'opuesto', 'receptor2']));
    expect(idsPorRotacion[2]).toEqual(new Set(['receptor2', 'central2', 'opuesto']));
    expect(idsPorRotacion[3]).toEqual(new Set(['opuesto', 'receptor1', 'central2']));
    expect(idsPorRotacion[4]).toEqual(new Set(['central2', 'colocador', 'receptor1']));
    expect(idsPorRotacion[5]).toEqual(new Set(['receptor1', 'central1', 'colocador']));
  });
});

describe('sustitutosLiberoPorDefecto', () => {
  it('017-E4: el defecto, rotación a rotación, es el central que cae en zaga en esa rotación', () => {
    const orden = ordenConLibero(); // P3=central1 (delantero en R1), P6=central2 (zaguero en R1)

    const defecto = sustitutosLiberoPorDefecto(orden);

    expect(defecto[1]).toBe('central2'); // R1: central2 en zaga
    expect(defecto[3]).toBe('central1'); // R3: central1 en zaga
  });
});
