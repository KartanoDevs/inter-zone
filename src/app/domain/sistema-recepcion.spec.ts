import { describe, expect, it } from 'vitest';
import type { Formacion, Jugador, OrdenSaque, PlantillaEquipo, Sistema } from './modelos';
import { formacionEnRotacion, jugadoresEnPista, sustitutosLiberoPorDefecto } from './rotacion';
import { borrarRotacion, explicarJugador, explicarRotacion, guardarFormacion, sistemaCompleto } from './sistema-recepcion';

function jugador(id: string, rol: Jugador['rol'], indice?: 1 | 2): Jugador {
  return indice === undefined ? { id, rol } : { id, rol, indice };
}

function ordenValidoEstandar(): OrdenSaque {
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
  return { nombre: 'Equipo A', ordenSaque: ordenValidoEstandar() };
}

/** Sistema vacío de partida. Crear un sistema es cosa de `catalogo-sistemas.ts` (spec 006). */
function sistemaVacio(): Sistema {
  return {
    id: 'sistema-1',
    nombre: 'Sistema',
    tipo: 'recepcion',
    plantilla: plantilla(),
    formaciones: {},
    explicacionesRotacion: {},
  };
}

const PUNTOS_LEGALES = [
  { x: 8, y: 8 },
  { x: 8, y: 1 },
  { x: 4.5, y: 1 },
  { x: 1, y: 1 },
  { x: 1, y: 6 },
  { x: 4.5, y: 6 },
];

/** Formación legal para cualquier rotación: la legalidad es geométrica, no depende de quién ocupe cada Pn. */
function formacionLegalPara(orden: OrdenSaque, rotacion: number): Formacion {
  const posiciones = formacionEnRotacion(orden, rotacion);
  return posiciones.map((jugador, indice) => ({ jugador, punto: PUNTOS_LEGALES[indice] }));
}

function formacionLegalR2(orden: OrdenSaque): Formacion {
  return formacionLegalPara(orden, 2);
}

function plantillaConLibero(sustituidoId: string): PlantillaEquipo {
  const sustitutosPorRotacion = { 1: sustituidoId, 2: sustituidoId, 3: sustituidoId, 4: sustituidoId, 5: sustituidoId, 6: sustituidoId };
  return { nombre: 'Equipo A', ordenSaque: ordenValidoEstandar(), libero: { jugador: jugador('libero', 'libero'), sustitutosPorRotacion } };
}

/** Igual que `formacionLegalPara`, pero con quien esté en pista de verdad (líbero incluido). */
function formacionLegalEnPista(plantilla: PlantillaEquipo, rotacion: number): Formacion {
  const posiciones = jugadoresEnPista(plantilla, rotacion);
  return posiciones.map((j, indice) => ({ jugador: j, punto: PUNTOS_LEGALES[indice] }));
}

describe('guardarFormacion', () => {
  it('005-E2: guardar una formación legal la asocia a esa rotación', () => {
    const sistema = sistemaVacio();
    const formacion = formacionLegalR2(sistema.plantilla.ordenSaque);

    const resultado = guardarFormacion(sistema, 2, formacion);

    expect(resultado).not.toBeNull();
    expect(resultado?.formaciones[2]).toEqual(formacion);
  });

  it('005-E3: guardar una formación con infracción se rechaza y no queda nada guardado', () => {
    const sistema = sistemaVacio();
    const [colocador, receptor1, receptor2, central1, central2, opuesto] = sistema.plantilla.ordenSaque;
    const formacionConFalta: Formacion = [
      { jugador: opuesto, punto: { x: 8, y: 0.5 } },
      { jugador: colocador, punto: { x: 8, y: 1 } },
      { jugador: receptor1, punto: { x: 4.5, y: 1 } },
      { jugador: receptor2, punto: { x: 1, y: 1 } },
      { jugador: central1, punto: { x: 1, y: 6 } },
      { jugador: central2, punto: { x: 4.5, y: 6 } },
    ];

    const resultado = guardarFormacion(sistema, 2, formacionConFalta);

    expect(resultado).toBeNull();
  });

  it('005-E4: un aviso al límite no bloquea el guardado', () => {
    const sistema = sistemaVacio();
    const legal = formacionLegalR2(sistema.plantilla.ordenSaque); // ya en orden P1..P6
    // Acerca al zaguero de P6 al delantero de P3 hasta dejar un margen de 3 cm (< ε = 5 cm).
    const formacionAlLimite: Formacion = legal.map((c, indice) =>
      indice === 5 ? { ...c, punto: { ...c.punto, y: legal[2].punto.y + 0.03 } } : c,
    );

    const resultado = guardarFormacion(sistema, 2, formacionAlLimite);

    expect(resultado).not.toBeNull();
  });

  it('005-E7: sobrescribir una rotación ya guardada la sustituye', () => {
    const sistema = sistemaVacio();
    const primera = formacionLegalR2(sistema.plantilla.ordenSaque);
    const conPrimera = guardarFormacion(sistema, 2, primera)!;
    const segunda: Formacion = primera.map((c) => ({ ...c, punto: { ...c.punto } }));

    const resultado = guardarFormacion(conPrimera, 2, segunda);

    expect(resultado?.formaciones[2]).toEqual(segunda);
    expect(resultado?.formaciones[2]).not.toBe(primera);
  });

  it('005-E8: un jugador ajeno a la plantilla se rechaza', () => {
    const sistema = sistemaVacio();
    const [colocador, receptor1, receptor2, central1, central2] = sistema.plantilla.ordenSaque;
    const intruso = jugador('intruso', 'opuesto');
    const formacion: Formacion = [
      { jugador: intruso, punto: { x: 8, y: 8 } },
      { jugador: colocador, punto: { x: 8, y: 1 } },
      { jugador: receptor1, punto: { x: 4.5, y: 1 } },
      { jugador: receptor2, punto: { x: 1, y: 1 } },
      { jugador: central1, punto: { x: 1, y: 6 } },
      { jugador: central2, punto: { x: 4.5, y: 6 } },
    ];

    const resultado = guardarFormacion(sistema, 2, formacion);

    expect(resultado).toBeNull();
  });

  it('005-E9: una formación que no coloca a los seis jugadores se rechaza', () => {
    const sistema = sistemaVacio();
    const formacionIncompleta = formacionLegalR2(sistema.plantilla.ordenSaque).slice(0, 5) as Formacion;

    const resultado = guardarFormacion(sistema, 2, formacionIncompleta);

    expect(resultado).toBeNull();
  });

  it('017-E11: guardar con la validación desactivada acepta una formación con falta posicional', () => {
    const sistema = sistemaVacio();
    const [colocador, receptor1, receptor2, central1, central2, opuesto] = sistema.plantilla.ordenSaque;
    const formacionConFalta: Formacion = [
      { jugador: opuesto, punto: { x: 8, y: 0.5 } },
      { jugador: colocador, punto: { x: 8, y: 1 } },
      { jugador: receptor1, punto: { x: 4.5, y: 1 } },
      { jugador: receptor2, punto: { x: 1, y: 1 } },
      { jugador: central1, punto: { x: 1, y: 6 } },
      { jugador: central2, punto: { x: 4.5, y: 6 } },
    ];

    const resultado = guardarFormacion(sistema, 2, formacionConFalta, false);

    expect(resultado).not.toBeNull();
    expect(resultado?.formaciones[2]).toEqual(formacionConFalta);
  });

  it('017-E12: desactivar la validación no permite guardar a un jugador ajeno al roster de la rotación', () => {
    const sistema = sistemaVacio();
    const [colocador, receptor1, receptor2, central1, central2] = sistema.plantilla.ordenSaque;
    const intruso = jugador('intruso', 'opuesto');
    const formacion: Formacion = [
      { jugador: intruso, punto: { x: 8, y: 8 } },
      { jugador: colocador, punto: { x: 8, y: 1 } },
      { jugador: receptor1, punto: { x: 4.5, y: 1 } },
      { jugador: receptor2, punto: { x: 1, y: 1 } },
      { jugador: central1, punto: { x: 1, y: 6 } },
      { jugador: central2, punto: { x: 4.5, y: 6 } },
    ];

    const resultado = guardarFormacion(sistema, 2, formacion, false);

    expect(resultado).toBeNull();
  });

  it('017-E13: con la validación activada, nada cambia respecto a hoy', () => {
    const sistema = sistemaVacio();
    const [colocador, receptor1, receptor2, central1, central2, opuesto] = sistema.plantilla.ordenSaque;
    const formacionConFalta: Formacion = [
      { jugador: opuesto, punto: { x: 8, y: 0.5 } },
      { jugador: colocador, punto: { x: 8, y: 1 } },
      { jugador: receptor1, punto: { x: 4.5, y: 1 } },
      { jugador: receptor2, punto: { x: 1, y: 1 } },
      { jugador: central1, punto: { x: 1, y: 6 } },
      { jugador: central2, punto: { x: 4.5, y: 6 } },
    ];

    const resultado = guardarFormacion(sistema, 2, formacionConFalta, true);

    expect(resultado).toBeNull();
  });
});

describe('guardarFormacion con líbero', () => {
  it('011-E9: guardar exige a quien está en pista de verdad, no al titular fijo', () => {
    const plantilla = plantillaConLibero('central2');
    const sistema: Sistema = { id: 's1', nombre: 'Sistema', tipo: 'recepcion', plantilla, formaciones: {}, explicacionesRotacion: {} };
    // R1: central2 es zaguero en esta plantilla -> en pista debería estar el líbero, no central2.
    const conElTitularEnVezDelLibero = formacionLegalPara(plantilla.ordenSaque, 1);

    const resultado = guardarFormacion(sistema, 1, conElTitularEnVezDelLibero);

    expect(resultado).toBeNull();
  });

  it('011-E10: un sistema con líbero guarda sus seis rotaciones sin ninguna bloqueada', () => {
    const plantilla = plantillaConLibero('central2');
    let sistema: Sistema = { id: 's1', nombre: 'Sistema', tipo: 'recepcion', plantilla, formaciones: {}, explicacionesRotacion: {} };

    for (let rotacion = 1; rotacion <= 6; rotacion++) {
      const guardado = guardarFormacion(sistema, rotacion, formacionLegalEnPista(plantilla, rotacion));
      expect(guardado).not.toBeNull();
      sistema = guardado!;
    }

    expect(sistemaCompleto(sistema)).toBe(true);
  });

  it('017-E10: con el sustituto por defecto (rotación a rotación), un sistema con líbero guarda sus seis rotaciones y el líbero juega las seis', () => {
    // Los dos centrales separados 3 posiciones (como en un 5-1 real, PLANTILLA_GLOBAL):
    // en cada rotación hay siempre exactamente un central en zaga y otro en delantera.
    // `ordenValidoEstandar()` no sirve aquí porque sus centrales van adyacentes.
    const orden: OrdenSaque = [
      jugador('colocador', 'colocador'),
      jugador('receptor1', 'receptor'),
      jugador('central1', 'central'),
      jugador('opuesto', 'opuesto'),
      jugador('receptor2', 'receptor'),
      jugador('central2', 'central'),
    ];
    const plantilla: PlantillaEquipo = {
      nombre: 'Equipo A',
      ordenSaque: orden,
      libero: { jugador: jugador('libero', 'libero'), sustitutosPorRotacion: sustitutosLiberoPorDefecto(orden) },
    };
    let sistema: Sistema = { id: 's1', nombre: 'Sistema', tipo: 'recepcion', plantilla, formaciones: {}, explicacionesRotacion: {} };

    for (let rotacion = 1; rotacion <= 6; rotacion++) {
      const guardado = guardarFormacion(sistema, rotacion, formacionLegalEnPista(plantilla, rotacion));
      expect(guardado).not.toBeNull();
      sistema = guardado!;
    }

    expect(sistemaCompleto(sistema)).toBe(true);
    for (let rotacion = 1; rotacion <= 6; rotacion++) {
      const idsEnRotacion = sistema.formaciones[rotacion as 1 | 2 | 3 | 4 | 5 | 6]?.map((c) => c.jugador.id);
      expect(idsEnRotacion).toContain('libero');
    }
  });
});

describe('sistemaCompleto', () => {
  it('005-E5: un sistema con menos de seis rotaciones no está completo', () => {
    const sistema = sistemaVacio();
    const conUna = guardarFormacion(sistema, 2, formacionLegalR2(sistema.plantilla.ordenSaque))!;

    expect(sistemaCompleto(conUna)).toBe(false);
  });

  it('005-E6: un sistema con las seis rotaciones legales está completo', () => {
    let sistema = sistemaVacio();
    for (let rotacion = 1; rotacion <= 6; rotacion++) {
      sistema = guardarFormacion(sistema, rotacion, formacionLegalPara(sistema.plantilla.ordenSaque, rotacion))!;
    }

    expect(sistemaCompleto(sistema)).toBe(true);
  });
});

describe('borrarRotacion', () => {
  it('005-E11: borrar una rotación ya guardada la deja vacía otra vez', () => {
    const sistema = sistemaVacio();
    const conR2 = guardarFormacion(sistema, 2, formacionLegalR2(sistema.plantilla.ordenSaque))!;

    const resultado = borrarRotacion(conR2, 2);

    expect(resultado.formaciones[2]).toBeUndefined();
  });

  it('005-E12: borrar una rotación deshace la completitud', () => {
    let sistema = sistemaVacio();
    for (let rotacion = 1; rotacion <= 6; rotacion++) {
      sistema = guardarFormacion(sistema, rotacion, formacionLegalPara(sistema.plantilla.ordenSaque, rotacion))!;
    }

    const resultado = borrarRotacion(sistema, 3);

    expect(sistemaCompleto(resultado)).toBe(false);
  });
});

describe('explicaciones de enseñanza', () => {
  it('007-E1: un sistema recién creado no tiene ninguna explicación', () => {
    const sistema = sistemaVacio();

    expect(sistema.explicacionesRotacion).toEqual({});
  });

  it('007-E2: guardar la explicación de una rotación la asocia a ella', () => {
    const sistema = sistemaVacio();
    const conFormacion = guardarFormacion(sistema, 2, formacionLegalR2(sistema.plantilla.ordenSaque))!;

    const resultado = explicarRotacion(conFormacion, 2, 'El colocador sube desde zaga izquierda');

    expect(resultado.explicacionesRotacion[2]).toBe('El colocador sube desde zaga izquierda');
  });

  it('007-E3: guardar la explicación de un jugador la asocia a él, sin afectar a otros', () => {
    const sistema = sistemaVacio();
    const conFormacion = guardarFormacion(sistema, 2, formacionLegalR2(sistema.plantilla.ordenSaque))!;
    const [colocador] = sistema.plantilla.ordenSaque;

    const resultado = explicarJugador(conFormacion, 2, colocador.id, 'Se esconde tras el opuesto')!;

    const delColocador = resultado.formaciones[2]?.find((c) => c.jugador.id === colocador.id);
    const deOtro = resultado.formaciones[2]?.find((c) => c.jugador.id !== colocador.id);
    expect(delColocador?.explicacion).toBe('Se esconde tras el opuesto');
    expect(deOtro?.explicacion).toBeUndefined();
  });

  it('007-E4: explicar a un jugador que no está en esa rotación se rechaza', () => {
    const sistema = sistemaVacio();
    const conFormacion = guardarFormacion(sistema, 2, formacionLegalR2(sistema.plantilla.ordenSaque))!;

    const resultado = explicarJugador(conFormacion, 2, 'intruso', 'texto');

    expect(resultado).toBeNull();
  });

  it('007-E5: volver a guardar la formación conserva la explicación de quien sigue colocado', () => {
    const sistema = sistemaVacio();
    const primera = formacionLegalR2(sistema.plantilla.ordenSaque);
    const conPrimera = guardarFormacion(sistema, 2, primera)!;
    const [colocador] = sistema.plantilla.ordenSaque;
    const conExplicacion = explicarJugador(conPrimera, 2, colocador.id, 'Se esconde tras el opuesto')!;

    // Formación "fresca", como la que produce el arrastre: sin el campo `explicacion`.
    const segunda: Formacion = primera.map((c) => ({ jugador: c.jugador, punto: { ...c.punto } }));
    const resultado = guardarFormacion(conExplicacion, 2, segunda)!;

    const delColocador = resultado.formaciones[2]?.find((c) => c.jugador.id === colocador.id);
    expect(delColocador?.explicacion).toBe('Se esconde tras el opuesto');
  });

  it('007-E6: un texto en blanco borra la explicación existente', () => {
    const sistema = sistemaVacio();
    const conFormacion = guardarFormacion(sistema, 2, formacionLegalR2(sistema.plantilla.ordenSaque))!;
    const [colocador] = sistema.plantilla.ordenSaque;
    const conAmbas = explicarJugador(explicarRotacion(conFormacion, 2, 'Algo'), 2, colocador.id, 'Algo más')!;

    const sinRotacion = explicarRotacion(conAmbas, 2, '   ');
    const sinJugador = explicarJugador(sinRotacion, 2, colocador.id, '')!;

    expect(sinRotacion.explicacionesRotacion[2]).toBeUndefined();
    expect(sinJugador.formaciones[2]?.find((c) => c.jugador.id === colocador.id)?.explicacion).toBeUndefined();
  });

  it('007-E7: borrar una rotación borra sus explicaciones', () => {
    const sistema = sistemaVacio();
    const conFormacion = guardarFormacion(sistema, 2, formacionLegalR2(sistema.plantilla.ordenSaque))!;
    const [colocador] = sistema.plantilla.ordenSaque;
    const conAmbas = explicarJugador(explicarRotacion(conFormacion, 2, 'Rotación'), 2, colocador.id, 'Jugador')!;

    const resultado = borrarRotacion(conAmbas, 2);

    expect(resultado.explicacionesRotacion[2]).toBeUndefined();
    expect(resultado.formaciones[2]).toBeUndefined();
  });

  it('007-E8: las explicaciones de una rotación no contaminan a otra', () => {
    const sistema = sistemaVacio();
    const [colocador] = sistema.plantilla.ordenSaque;
    const conR1 = guardarFormacion(sistema, 1, formacionLegalPara(sistema.plantilla.ordenSaque, 1))!;
    const conR1yR2 = guardarFormacion(conR1, 2, formacionLegalPara(sistema.plantilla.ordenSaque, 2))!;

    const resultado = explicarJugador(conR1yR2, 1, colocador.id, 'Explicación en R1')!;

    const enR2 = resultado.formaciones[2]?.find((c) => c.jugador.id === colocador.id);
    expect(enR2?.explicacion).toBeUndefined();
  });
});
