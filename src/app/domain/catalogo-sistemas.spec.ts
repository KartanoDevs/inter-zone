import { describe, expect, it } from 'vitest';
import type { Jugador, OrdenSaque, PlantillaEquipo, Sistema } from './modelos';
import { borrarSistema, cambiarPlantilla, crearSistema, ordenarCatalogo, renombrarSistema } from './catalogo-sistemas';

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

function plantillaConLibero(): PlantillaEquipo {
  return {
    nombre: 'Equipo A',
    ordenSaque: [
      jugador('colocador', 'colocador'),
      jugador('receptor1', 'receptor', 1),
      jugador('receptor2', 'receptor', 2),
      jugador('central1', 'central', 1),
      jugador('libero', 'libero'),
      jugador('opuesto', 'opuesto'),
    ],
  };
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
    const existente: Sistema = { id: 's1', nombre: 'Recepción 5-1', tipo: 'recepcion', plantilla: plantilla(), formaciones: {} };

    const resultado = crearSistema('s2', 'Recepción 5-1', 'recepcion', plantilla(), [existente]);

    expect(resultado).toBeNull();
  });

  it('006-E5: mismo nombre en tipos distintos se acepta', () => {
    const existente: Sistema = { id: 's1', nombre: 'Base', tipo: 'recepcion', plantilla: plantilla(), formaciones: {} };

    const resultado = crearSistema('s2', 'Base', 'defensa', plantilla(), [existente]);

    expect(resultado).not.toBeNull();
  });
});

describe('renombrarSistema', () => {
  it('006-E6: renombrar a un nombre libre se acepta', () => {
    const sistema: Sistema = { id: 's1', nombre: 'Recepción A', tipo: 'recepcion', plantilla: plantilla(), formaciones: {} };

    const resultado = renombrarSistema(sistema, 'Recepción B', [sistema]);

    expect(resultado?.nombre).toBe('Recepción B');
  });

  it('006-E7: renombrar a un nombre ocupado por otro del mismo tipo se rechaza', () => {
    const sistema: Sistema = { id: 's1', nombre: 'Recepción A', tipo: 'recepcion', plantilla: plantilla(), formaciones: {} };
    const otro: Sistema = { id: 's2', nombre: 'Recepción B', tipo: 'recepcion', plantilla: plantilla(), formaciones: {} };

    const resultado = renombrarSistema(sistema, 'Recepción B', [sistema, otro]);

    expect(resultado).toBeNull();
  });

  it('006-E8: renombrar a su propio nombre actual se acepta', () => {
    const sistema: Sistema = { id: 's1', nombre: 'Recepción A', tipo: 'recepcion', plantilla: plantilla(), formaciones: {} };

    const resultado = renombrarSistema(sistema, 'Recepción A', [sistema]);

    expect(resultado).not.toBeNull();
  });
});

describe('borrarSistema', () => {
  it('006-E9: borrar un sistema no afecta a los demás', () => {
    const uno: Sistema = { id: 's1', nombre: 'Uno', tipo: 'recepcion', plantilla: plantilla(), formaciones: {} };
    const dos: Sistema = { id: 's2', nombre: 'Dos', tipo: 'recepcion', plantilla: plantilla(), formaciones: {} };

    const resultado = borrarSistema([uno, dos], 's1');

    expect(resultado).toEqual([dos]);
  });
});

describe('ordenarCatalogo', () => {
  it('006-E10: recepción antes que defensa, alfabético dentro de cada grupo', () => {
    const defensaB: Sistema = { id: '1', nombre: 'Defensa B', tipo: 'defensa', plantilla: plantilla(), formaciones: {} };
    const recepcionB: Sistema = { id: '2', nombre: 'Recepción B', tipo: 'recepcion', plantilla: plantilla(), formaciones: {} };
    const defensaA: Sistema = { id: '3', nombre: 'Defensa A', tipo: 'defensa', plantilla: plantilla(), formaciones: {} };
    const recepcionA: Sistema = { id: '4', nombre: 'Recepción A', tipo: 'recepcion', plantilla: plantilla(), formaciones: {} };

    const resultado = ordenarCatalogo([defensaB, recepcionB, defensaA, recepcionA]);

    expect(resultado.map((s) => s.nombre)).toEqual(['Recepción A', 'Recepción B', 'Defensa A', 'Defensa B']);
  });
});

describe('cambiarPlantilla', () => {
  it('006-E11: cambiar quién ocupa la sexta plaza sustituye la plantilla', () => {
    const sistema: Sistema = { id: 's1', nombre: 'Sistema', tipo: 'recepcion', plantilla: plantilla(), formaciones: {} };

    const resultado = cambiarPlantilla(sistema, plantillaConLibero());

    expect(resultado.plantilla).toEqual(plantillaConLibero());
  });

  it('006-E12: cambiar de ocupante retira al saliente de las rotaciones guardadas', () => {
    const central2 = jugador('central2', 'central', 2);
    const colocador = jugador('colocador', 'colocador');
    const sistema: Sistema = {
      id: 's1',
      nombre: 'Sistema',
      tipo: 'recepcion',
      plantilla: plantilla(),
      formaciones: {
        1: [
          { jugador: colocador, punto: { x: 8, y: 1 } },
          { jugador: central2, punto: { x: 4.5, y: 6 } },
        ],
      },
    };

    const resultado = cambiarPlantilla(sistema, plantillaConLibero());

    const idsEnR1 = resultado.formaciones[1]?.map((c) => c.jugador.id);
    expect(idsEnR1).not.toContain('central2');
    expect(idsEnR1).toContain('colocador');
  });
});
