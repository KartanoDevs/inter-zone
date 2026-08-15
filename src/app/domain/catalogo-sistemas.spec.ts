import { describe, expect, it } from 'vitest';
import type { Jugador, OrdenSaque, PlantillaEquipo, Sistema } from './modelos';
import {
  borrarSistema,
  cambiarSustitutoLibero,
  crearSistema,
  ordenarCatalogo,
  renombrarSistema,
} from './catalogo-sistemas';

function jugador(id: string, rol: Jugador['rol'], indice?: 1 | 2): Jugador {
  return indice === undefined ? { id, rol } : { id, rol, indice };
}

function ordenConCentral2(): OrdenSaque {
  return [
    jugador('colocador', 'colocador'),
    jugador('receptor1', 'receptor', 1),
    jugador('receptor2', 'receptor', 2),
    jugador('central1', 'central', 1),
    jugador('central2', 'central', 2),
    jugador('opuesto', 'opuesto'),
  ];
}

function plantilla(): PlantillaEquipo {
  return { nombre: 'Equipo A', ordenSaque: ordenConCentral2() };
}

function plantillaConLibero(sustituidoId: string): PlantillaEquipo {
  const sustitutosPorRotacion = { 1: sustituidoId, 2: sustituidoId, 3: sustituidoId, 4: sustituidoId, 5: sustituidoId, 6: sustituidoId };
  return { nombre: 'Equipo A', ordenSaque: ordenConCentral2(), libero: { jugador: jugador('libero', 'libero'), sustitutosPorRotacion } };
}

describe('crearSistema', () => {
  it('006-E1: crear un sistema de recepción se acepta', () => {
    const resultado = crearSistema('s1', 'Recepción 5-1', 'recepcion', plantilla(), []);

    expect(resultado).not.toBeNull();
    expect(resultado?.tipo).toBe('recepcion');
  });

  it('006-E2: crear un sistema de defensa se acepta', () => {
    const resultado = crearSistema('s1', 'Defensa base', 'defensa', plantilla(), []);

    expect(resultado).not.toBeNull();
    expect(resultado?.tipo).toBe('defensa');
  });

  it('006-E3: nombre vacío o en blanco se rechaza', () => {
    expect(crearSistema('s1', '', 'recepcion', plantilla(), [])).toBeNull();
    expect(crearSistema('s1', '   ', 'recepcion', plantilla(), [])).toBeNull();
  });

  it('006-E4: nombre duplicado dentro del mismo tipo se rechaza', () => {
    const existente: Sistema = { id: 's1', nombre: 'Recepción 5-1', tipo: 'recepcion', plantilla: plantilla(), formaciones: {}, explicacionesRotacion: {} };

    const resultado = crearSistema('s2', 'Recepción 5-1', 'recepcion', plantilla(), [existente]);

    expect(resultado).toBeNull();
  });

  it('006-E5: mismo nombre en tipos distintos se acepta', () => {
    const existente: Sistema = { id: 's1', nombre: 'Base', tipo: 'recepcion', plantilla: plantilla(), formaciones: {}, explicacionesRotacion: {} };

    const resultado = crearSistema('s2', 'Base', 'defensa', plantilla(), [existente]);

    expect(resultado).not.toBeNull();
  });
});

describe('renombrarSistema', () => {
  it('006-E6: renombrar a un nombre libre se acepta', () => {
    const sistema: Sistema = { id: 's1', nombre: 'Recepción A', tipo: 'recepcion', plantilla: plantilla(), formaciones: {}, explicacionesRotacion: {} };

    const resultado = renombrarSistema(sistema, 'Recepción B', [sistema]);

    expect(resultado?.nombre).toBe('Recepción B');
  });

  it('006-E7: renombrar a un nombre ocupado por otro del mismo tipo se rechaza', () => {
    const sistema: Sistema = { id: 's1', nombre: 'Recepción A', tipo: 'recepcion', plantilla: plantilla(), formaciones: {}, explicacionesRotacion: {} };
    const otro: Sistema = { id: 's2', nombre: 'Recepción B', tipo: 'recepcion', plantilla: plantilla(), formaciones: {}, explicacionesRotacion: {} };

    const resultado = renombrarSistema(sistema, 'Recepción B', [sistema, otro]);

    expect(resultado).toBeNull();
  });

  it('006-E8: renombrar a su propio nombre actual se acepta', () => {
    const sistema: Sistema = { id: 's1', nombre: 'Recepción A', tipo: 'recepcion', plantilla: plantilla(), formaciones: {}, explicacionesRotacion: {} };

    const resultado = renombrarSistema(sistema, 'Recepción A', [sistema]);

    expect(resultado).not.toBeNull();
  });
});

describe('borrarSistema', () => {
  it('006-E9: borrar un sistema no afecta a los demás', () => {
    const uno: Sistema = { id: 's1', nombre: 'Uno', tipo: 'recepcion', plantilla: plantilla(), formaciones: {}, explicacionesRotacion: {} };
    const dos: Sistema = { id: 's2', nombre: 'Dos', tipo: 'recepcion', plantilla: plantilla(), formaciones: {}, explicacionesRotacion: {} };

    const resultado = borrarSistema([uno, dos], 's1');

    expect(resultado).toEqual([dos]);
  });
});

describe('ordenarCatalogo', () => {
  it('006-E10: recepción antes que defensa, alfabético dentro de cada grupo', () => {
    const defensaB: Sistema = { id: '1', nombre: 'Defensa B', tipo: 'defensa', plantilla: plantilla(), formaciones: {}, explicacionesRotacion: {} };
    const recepcionB: Sistema = { id: '2', nombre: 'Recepción B', tipo: 'recepcion', plantilla: plantilla(), formaciones: {}, explicacionesRotacion: {} };
    const defensaA: Sistema = { id: '3', nombre: 'Defensa A', tipo: 'defensa', plantilla: plantilla(), formaciones: {}, explicacionesRotacion: {} };
    const recepcionA: Sistema = { id: '4', nombre: 'Recepción A', tipo: 'recepcion', plantilla: plantilla(), formaciones: {}, explicacionesRotacion: {} };

    const resultado = ordenarCatalogo([defensaB, recepcionB, defensaA, recepcionA]);

    expect(resultado.map((s) => s.nombre)).toEqual(['Recepción A', 'Recepción B', 'Defensa A', 'Defensa B']);
  });
});

describe('cambiarSustitutoLibero', () => {
  it('011-E11 (revisa firma por rotación, 017-E8): cambiar a quién sustituye el líbero en una rotación purga lo que deja de valer en esa rotación, sin afectar a las demás', () => {
    const plantillaCentral2 = plantillaConLibero('central2');
    const [colocador, receptor1, receptor2, central1, , opuesto] = plantillaCentral2.ordenSaque;
    const libero = plantillaCentral2.libero!.jugador;
    // R1: central2 es zaguero en esta plantilla -> juega el líbero por él. Opuesto también es
    // zaguero en R1, pero como el líbero sustituye a central2, opuesto juega de titular.
    const formacionR2 = [{ jugador: colocador, punto: { x: 5, y: 5 } }];
    const sistema: Sistema = {
      id: 's1',
      nombre: 'Sistema',
      tipo: 'recepcion',
      plantilla: plantillaCentral2,
      formaciones: {
        1: [
          { jugador: colocador, punto: { x: 8, y: 1 } },
          { jugador: receptor1, punto: { x: 4.5, y: 1 } },
          { jugador: receptor2, punto: { x: 1, y: 1 } },
          { jugador: central1, punto: { x: 1, y: 6 } },
          { jugador: libero, punto: { x: 4.5, y: 6 } },
          { jugador: opuesto, punto: { x: 8, y: 8 } },
        ],
        2: formacionR2,
      },
      explicacionesRotacion: {},
    };

    const resultado = cambiarSustitutoLibero(sistema, 1, 'opuesto');

    const idsEnR1 = resultado.formaciones[1]?.map((c) => c.jugador.id);
    expect(idsEnR1).not.toContain('opuesto');
    expect(idsEnR1).toContain('libero');
    // 017-E8: la rotación 2 no ha cambiado su sustituto -> su formación queda intacta.
    expect(resultado.formaciones[2]).toEqual(formacionR2);
  });
});
