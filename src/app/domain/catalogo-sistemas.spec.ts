import { describe, expect, it } from 'vitest';
import type { EquipoId, Jugador, OrdenSaque, PlantillaEquipo, Sistema } from './modelos';
import {
  borrarSistema,
  cambiarSustitutoLibero,
  clonarSistema,
  crearSistema,
  describirSistema,
  estadoDe,
  invalidarSistema,
  ordenarCatalogo,
  renombrarSistema,
  validarSistema,
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

function sistema(id: string, nombre: string, equipoId: EquipoId = 'masculino'): Sistema {
  return { id, nombre, tipo: 'recepcion', equipoId, plantilla: plantilla(), formaciones: {}, explicacionesRotacion: {} };
}

function sistemaConLibero(id: string, nombre: string): Sistema {
  return {
    id,
    nombre,
    tipo: 'recepcion',
    equipoId: 'masculino',
    plantilla: plantillaConLibero('central2'),
    formaciones: {},
    explicacionesRotacion: {},
  };
}

function plantillaConLibero(sustituidoId: string): PlantillaEquipo {
  const sustitutosPorRotacion = { 1: sustituidoId, 2: sustituidoId, 3: sustituidoId, 4: sustituidoId, 5: sustituidoId, 6: sustituidoId };
  return { nombre: 'Equipo A', ordenSaque: ordenConCentral2(), libero: { jugador: jugador('libero', 'libero'), sustitutosPorRotacion } };
}

describe('crearSistema', () => {
  it('006-E1: crear un sistema de recepción se acepta', () => {
    const resultado = crearSistema('s1', 'Recepción 5-1', 'recepcion', 'masculino', plantilla(), []);

    expect(resultado).not.toBeNull();
    expect(resultado?.tipo).toBe('recepcion');
  });

  it('006-E2: crear un sistema de defensa se acepta', () => {
    const resultado = crearSistema('s1', 'Defensa base', 'defensa', 'masculino', plantilla(), []);

    expect(resultado).not.toBeNull();
    expect(resultado?.tipo).toBe('defensa');
  });

  it('006-E3: nombre vacío o en blanco se rechaza', () => {
    expect(crearSistema('s1', '', 'recepcion', 'masculino', plantilla(), [])).toBeNull();
    expect(crearSistema('s1', '   ', 'recepcion', 'masculino', plantilla(), [])).toBeNull();
  });

  it('006-E4: nombre duplicado dentro del mismo tipo y equipo se rechaza', () => {
    const existente = sistema('s1', 'Recepción 5-1');

    const resultado = crearSistema('s2', 'Recepción 5-1', 'recepcion', 'masculino', plantilla(), [existente]);

    expect(resultado).toBeNull();
  });

  it('006-E5: mismo nombre en tipos distintos se acepta', () => {
    const existente = sistema('s1', 'Base');

    const resultado = crearSistema('s2', 'Base', 'defensa', 'masculino', plantilla(), [existente]);

    expect(resultado).not.toBeNull();
  });

  it('032-E1: crear asigna el sistema al equipo elegido', () => {
    const resultado = crearSistema('s1', 'Recepción 5-1', 'recepcion', 'femenino', plantilla(), []);

    expect(resultado?.equipoId).toBe('femenino');
  });

  it('032-E2: el mismo nombre puede repetirse en equipos distintos', () => {
    const existente = sistema('s1', '5-1', 'masculino');

    const resultado = crearSistema('s2', '5-1', 'recepcion', 'femenino', plantilla(), [existente]);

    expect(resultado).not.toBeNull();
  });

  it('032-E3: dentro del mismo equipo, el nombre repetido se sigue rechazando', () => {
    const existente = sistema('s1', '5-1', 'masculino');

    const resultado = crearSistema('s2', '5-1', 'recepcion', 'masculino', plantilla(), [existente]);

    expect(resultado).toBeNull();
  });
});

describe('renombrarSistema', () => {
  it('006-E6: renombrar a un nombre libre se acepta', () => {
    const uno = sistema('s1', 'Recepción A');

    const resultado = renombrarSistema(uno, 'Recepción B', [uno]);

    expect(resultado?.nombre).toBe('Recepción B');
  });

  it('006-E7: renombrar a un nombre ocupado por otro del mismo tipo se rechaza', () => {
    const uno = sistema('s1', 'Recepción A');
    const otro = sistema('s2', 'Recepción B');

    const resultado = renombrarSistema(uno, 'Recepción B', [uno, otro]);

    expect(resultado).toBeNull();
  });

  it('006-E8: renombrar a su propio nombre actual se acepta', () => {
    const uno = sistema('s1', 'Recepción A');

    const resultado = renombrarSistema(uno, 'Recepción A', [uno]);

    expect(resultado).not.toBeNull();
  });
});

describe('borrarSistema', () => {
  it('006-E9: borrar un sistema no afecta a los demás', () => {
    const uno = sistema('s1', 'Uno');
    const dos = sistema('s2', 'Dos');

    const resultado = borrarSistema([uno, dos], 's1');

    expect(resultado).toEqual([dos]);
  });
});

describe('clonarSistema', () => {
  it('026-E1: clonar copia las seis formaciones', () => {
    const [colocador] = plantilla().ordenSaque;
    const original: Sistema = {
      id: 's1',
      nombre: 'Original',
      tipo: 'recepcion',
      equipoId: 'masculino',
      plantilla: plantilla(),
      formaciones: { 1: [{ jugador: colocador, punto: { x: 8, y: 1 } }], 2: [{ jugador: colocador, punto: { x: 7, y: 1 } }] },
      explicacionesRotacion: {},
    };

    const resultado = clonarSistema(original, 's2', 'Original (copia)', [original]);

    expect(resultado?.formaciones).toEqual(original.formaciones);
  });

  it('026-E2: el clon copia la descripción general', () => {
    const original: Sistema = { ...sistema('s1', 'Original'), descripcion: 'Recepción a 3 en 5-1.' };

    const resultado = clonarSistema(original, 's2', 'Original (copia)', [original]);

    expect(resultado?.descripcion).toBe('Recepción a 3 en 5-1.');
  });

  it('026-E3: el clon copia las explicaciones de rotación y de jugador', () => {
    const [colocador] = plantilla().ordenSaque;
    const original: Sistema = {
      ...sistema('s1', 'Original'),
      formaciones: { 1: [{ jugador: colocador, punto: { x: 8, y: 1 }, explicacion: 'Explicación del jugador' }] },
      explicacionesRotacion: { 1: 'Explicación de la rotación' },
    };

    const resultado = clonarSistema(original, 's2', 'Original (copia)', [original]);

    expect(resultado?.explicacionesRotacion[1]).toBe('Explicación de la rotación');
    expect(resultado?.formaciones[1]?.[0]?.explicacion).toBe('Explicación del jugador');
  });

  it('026-E4: el clon copia a quién sustituye el líbero en cada rotación', () => {
    const original = sistemaConLibero('s1', 'Original');

    const resultado = clonarSistema(original, 's2', 'Original (copia)', [original]);

    expect(resultado?.plantilla.libero?.sustitutosPorRotacion).toEqual(original.plantilla.libero?.sustitutosPorRotacion);
  });

  it('026-E5: el clon es independiente, editarlo no toca el original', () => {
    const [colocador] = plantilla().ordenSaque;
    const original: Sistema = { ...sistema('s1', 'Original'), formaciones: { 1: [{ jugador: colocador, punto: { x: 8, y: 1 } }] } };

    const clon = clonarSistema(original, 's2', 'Original (copia)', [original])!;
    const clonEditado = { ...clon, formaciones: { ...clon.formaciones, 1: [{ jugador: colocador, punto: { x: 1, y: 1 } }] } };

    expect(clonEditado.formaciones[1]?.[0]?.punto).toEqual({ x: 1, y: 1 });
    expect(original.formaciones[1]?.[0]?.punto).toEqual({ x: 8, y: 1 });
  });

  it('032-E4: el clon mantiene el mismo equipo que el original', () => {
    const original = sistema('s1', 'Original', 'femenino');

    const resultado = clonarSistema(original, 's2', 'Original (copia)', [original]);

    expect(resultado?.equipoId).toBe('femenino');
  });

  it('026-E6: el clon nace con un id distinto', () => {
    const original = sistema('s1', 'Original');

    const resultado = clonarSistema(original, 's2', 'Original (copia)', [original]);

    expect(resultado?.id).not.toBe(original.id);
  });

  it('026-E8: un nombre de clon repetido dentro del mismo tipo se rechaza', () => {
    const original = sistema('s1', 'Original');
    const otro: Sistema = { ...sistema('s2', 'Original (copia)') };

    const resultado = clonarSistema(original, 's3', 'Original (copia)', [original, otro]);

    expect(resultado).toBeNull();
  });

  it('026-E9: el clon es del mismo tipo que el original', () => {
    const original: Sistema = { ...sistema('s1', 'Original'), tipo: 'defensa' };

    const resultado = clonarSistema(original, 's2', 'Original (copia)', [original]);

    expect(resultado?.tipo).toBe('defensa');
  });
});

describe('ordenarCatalogo', () => {
  it('006-E10: recepción antes que defensa, alfabético dentro de cada grupo', () => {
    const defensaB: Sistema = { ...sistema('1', 'Defensa B'), tipo: 'defensa' };
    const recepcionB = sistema('2', 'Recepción B');
    const defensaA: Sistema = { ...sistema('3', 'Defensa A'), tipo: 'defensa' };
    const recepcionA = sistema('4', 'Recepción A');

    const resultado = ordenarCatalogo([defensaB, recepcionB, defensaA, recepcionA]);

    expect(resultado.map((s) => s.nombre)).toEqual(['Recepción A', 'Recepción B', 'Defensa A', 'Defensa B']);
  });
});

describe('crearSistema (spec 025)', () => {
  it('025-E11: un sistema creado a mano nace sin descripción', () => {
    const resultado = crearSistema('s1', 'Recepción 5-1', 'recepcion', 'masculino', plantilla(), []);

    expect(resultado?.descripcion).toBeUndefined();
  });
});

describe('describirSistema', () => {
  it('025-E9: editar la descripción la deja guardada', () => {
    const resultado = describirSistema(sistema('s1', 'Uno'), 'Recepción a 3 en 5-1.');

    expect(resultado.descripcion).toBe('Recepción a 3 en 5-1.');
  });

  it('025-E10: vaciar el texto borra la descripción', () => {
    const conDescripcion: Sistema = { ...sistema('s1', 'Uno'), descripcion: 'Texto previo' };

    const resultado = describirSistema(conDescripcion, '   ');

    expect(resultado.descripcion).toBeUndefined();
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
      equipoId: 'masculino',
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

  it('043-E1: cambiar el sustituto mantiene los seis colocados en esa rotación', () => {
    const plantillaCentral2 = plantillaConLibero('central2');
    const [colocador, receptor1, receptor2, central1, , opuesto] = plantillaCentral2.ordenSaque;
    const libero = plantillaCentral2.libero!.jugador;
    const sistemaConFormacion: Sistema = {
      ...sistemaConLibero('s1', 'Sistema'),
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
      },
    };

    const resultado = cambiarSustitutoLibero(sistemaConFormacion, 1, 'opuesto');

    expect(resultado.formaciones[1]).toHaveLength(6);
  });

  it('043-E2: quien entra hereda el punto exacto de quien sale, y el líbero hereda el de quien acaba de salir', () => {
    const plantillaCentral2 = plantillaConLibero('central2');
    const [colocador, receptor1, receptor2, central1, , opuesto] = plantillaCentral2.ordenSaque;
    const libero = plantillaCentral2.libero!.jugador;
    const puntoDeLibero = { x: 4.5, y: 6 };
    const puntoDeOpuesto = { x: 8, y: 8 };
    const sistemaConFormacion: Sistema = {
      ...sistemaConLibero('s1', 'Sistema'),
      plantilla: plantillaCentral2,
      formaciones: {
        1: [
          { jugador: colocador, punto: { x: 8, y: 1 } },
          { jugador: receptor1, punto: { x: 4.5, y: 1 } },
          { jugador: receptor2, punto: { x: 1, y: 1 } },
          { jugador: central1, punto: { x: 1, y: 6 } },
          { jugador: libero, punto: puntoDeLibero },
          { jugador: opuesto, punto: puntoDeOpuesto },
        ],
      },
    };

    const resultado = cambiarSustitutoLibero(sistemaConFormacion, 1, 'opuesto');

    const formacionR1 = resultado.formaciones[1]!;
    const central2Vuelto = formacionR1.find((c) => c.jugador.id === 'central2');
    const liberoNuevo = formacionR1.find((c) => c.jugador.id === 'libero');
    expect(central2Vuelto?.punto).toEqual(puntoDeLibero);
    expect(liberoNuevo?.punto).toEqual(puntoDeOpuesto);
  });

  it('043-E3: cambiar a "ninguno" devuelve al titular sustituido, en el punto donde estaba el líbero', () => {
    const plantillaCentral2 = plantillaConLibero('central2');
    const [colocador, receptor1, receptor2, central1, , opuesto] = plantillaCentral2.ordenSaque;
    const libero = plantillaCentral2.libero!.jugador;
    const puntoDeLibero = { x: 4.5, y: 6 };
    const sistemaConFormacion: Sistema = {
      ...sistemaConLibero('s1', 'Sistema'),
      plantilla: plantillaCentral2,
      formaciones: {
        1: [
          { jugador: colocador, punto: { x: 8, y: 1 } },
          { jugador: receptor1, punto: { x: 4.5, y: 1 } },
          { jugador: receptor2, punto: { x: 1, y: 1 } },
          { jugador: central1, punto: { x: 1, y: 6 } },
          { jugador: libero, punto: puntoDeLibero },
          { jugador: opuesto, punto: { x: 8, y: 8 } },
        ],
      },
    };

    const resultado = cambiarSustitutoLibero(sistemaConFormacion, 1, null);

    const formacionR1 = resultado.formaciones[1]!;
    expect(formacionR1).toHaveLength(6);
    expect(formacionR1.map((c) => c.jugador.id)).not.toContain('libero');
    expect(formacionR1.find((c) => c.jugador.id === 'central2')?.punto).toEqual(puntoDeLibero);
  });

  it('043-E4: elegir un titular delantero saca al líbero sin que nadie herede el punto de nadie', () => {
    // En R1 (ordenConCentral2): receptor1 ocupa P2, línea delantera.
    const plantillaCentral2 = plantillaConLibero('central2');
    const [colocador, receptor1, receptor2, central1, , opuesto] = plantillaCentral2.ordenSaque;
    const libero = plantillaCentral2.libero!.jugador;
    const puntoDeReceptor1 = { x: 4.5, y: 1 };
    const puntoDeLibero = { x: 4.5, y: 6 };
    const sistemaConFormacion: Sistema = {
      ...sistemaConLibero('s1', 'Sistema'),
      plantilla: plantillaCentral2,
      formaciones: {
        1: [
          { jugador: colocador, punto: { x: 8, y: 1 } },
          { jugador: receptor1, punto: puntoDeReceptor1 },
          { jugador: receptor2, punto: { x: 1, y: 1 } },
          { jugador: central1, punto: { x: 1, y: 6 } },
          { jugador: libero, punto: puntoDeLibero },
          { jugador: opuesto, punto: { x: 8, y: 8 } },
        ],
      },
    };

    const resultado = cambiarSustitutoLibero(sistemaConFormacion, 1, 'receptor1');

    const formacionR1 = resultado.formaciones[1]!;
    expect(formacionR1).toHaveLength(6);
    expect(formacionR1.map((c) => c.jugador.id)).not.toContain('libero');
    expect(formacionR1.find((c) => c.jugador.id === 'receptor1')?.punto).toEqual(puntoDeReceptor1);
    expect(formacionR1.find((c) => c.jugador.id === 'central2')?.punto).toEqual(puntoDeLibero);
  });

  it('043-E5: cambiar el sustituto de una rotación no toca las formaciones de las demás', () => {
    const plantillaCentral2 = plantillaConLibero('central2');
    const [colocador, receptor1, receptor2, central1, , opuesto] = plantillaCentral2.ordenSaque;
    const libero = plantillaCentral2.libero!.jugador;
    const formacionR2 = [{ jugador: colocador, punto: { x: 5, y: 5 } }];
    const sistemaConFormacion: Sistema = {
      ...sistemaConLibero('s1', 'Sistema'),
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
    };

    const resultado = cambiarSustitutoLibero(sistemaConFormacion, 1, 'opuesto');

    expect(resultado.formaciones[2]).toEqual(formacionR2);
  });

  it('043-E6: sin formación guardada todavía, cambiar el sustituto solo cambia la plantilla', () => {
    const resultado = cambiarSustitutoLibero(sistemaConLibero('s1', 'Sistema'), 3, 'opuesto');

    expect(resultado.formaciones[3]).toBeUndefined();
    expect(resultado.plantilla.libero?.sustitutosPorRotacion[3]).toBe('opuesto');
  });
});

describe('validarSistema / invalidarSistema (spec 051)', () => {
  it('051-E1: un sistema recién creado nace en borrador', () => {
    const nuevo = crearSistema('s1', 'Recepción', 'recepcion', 'masculino', plantilla(), []);

    expect(estadoDe(nuevo!)).toBe('borrador');
  });

  it('validarSistema deja el sistema en estado validado', () => {
    const resultado = validarSistema(sistema('s1', 'Recepción'));

    expect(estadoDe(resultado)).toBe('validado');
  });

  it('051-E6: invalidarSistema devuelve un sistema validado a borrador', () => {
    const validado = validarSistema(sistema('s1', 'Recepción'));

    const resultado = invalidarSistema(validado);

    expect(estadoDe(resultado)).toBe('borrador');
  });
});
