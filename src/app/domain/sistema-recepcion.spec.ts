import { describe, expect, it } from 'vitest';
import type { Formacion, Jugador, OrdenSaque, PlantillaEquipo, Sistema } from './modelos';
import { formacionEnRotacion } from './rotacion';
import { borrarRotacion, crearSistema, guardarFormacion, sistemaCompleto } from './sistema-recepcion';

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

describe('crearSistema', () => {
  it('005-E1: crear un sistema vacío se acepta sin ninguna rotación guardada', () => {
    const resultado = crearSistema('Recepción de 3 jugadores V1', plantilla(), []);

    expect(resultado).not.toBeNull();
    expect(resultado?.formaciones).toEqual({});
  });

  it('005-E10: dos sistemas con el mismo nombre se rechaza', () => {
    const existente: Sistema = { nombre: 'Recepción de 3 jugadores V1', plantilla: plantilla(), formaciones: {} };

    const resultado = crearSistema('Recepción de 3 jugadores V1', plantilla(), [existente]);

    expect(resultado).toBeNull();
  });
});

describe('guardarFormacion', () => {
  it('005-E2: guardar una formación legal la asocia a esa rotación', () => {
    const sistema = crearSistema('Sistema', plantilla(), [])!;
    const formacion = formacionLegalR2(sistema.plantilla.ordenSaque);

    const resultado = guardarFormacion(sistema, 2, formacion);

    expect(resultado).not.toBeNull();
    expect(resultado?.formaciones[2]).toEqual(formacion);
  });

  it('005-E3: guardar una formación con infracción se rechaza y no queda nada guardado', () => {
    const sistema = crearSistema('Sistema', plantilla(), [])!;
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
    const sistema = crearSistema('Sistema', plantilla(), [])!;
    const [colocador, receptor1, receptor2, central1, central2, opuesto] = sistema.plantilla.ordenSaque;
    const formacionAlLimite: Formacion = [
      { jugador: opuesto, punto: { x: 8, y: 8 } },
      { jugador: colocador, punto: { x: 8, y: 1 } },
      { jugador: receptor1, punto: { x: 4.5, y: 4 } },
      { jugador: receptor2, punto: { x: 1, y: 1 } },
      { jugador: central1, punto: { x: 1, y: 6 } },
      { jugador: central2, punto: { x: 4.5, y: 4.03 } },
    ];

    const resultado = guardarFormacion(sistema, 2, formacionAlLimite);

    expect(resultado).not.toBeNull();
  });

  it('005-E7: sobrescribir una rotación ya guardada la sustituye', () => {
    const sistema = crearSistema('Sistema', plantilla(), [])!;
    const primera = formacionLegalR2(sistema.plantilla.ordenSaque);
    const conPrimera = guardarFormacion(sistema, 2, primera)!;
    const segunda: Formacion = primera.map((c) => ({ ...c, punto: { ...c.punto } }));

    const resultado = guardarFormacion(conPrimera, 2, segunda);

    expect(resultado?.formaciones[2]).toEqual(segunda);
    expect(resultado?.formaciones[2]).not.toBe(primera);
  });

  it('005-E8: un jugador ajeno a la plantilla se rechaza', () => {
    const sistema = crearSistema('Sistema', plantilla(), [])!;
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
    const sistema = crearSistema('Sistema', plantilla(), [])!;
    const formacionIncompleta = formacionLegalR2(sistema.plantilla.ordenSaque).slice(0, 5) as Formacion;

    const resultado = guardarFormacion(sistema, 2, formacionIncompleta);

    expect(resultado).toBeNull();
  });
});

describe('sistemaCompleto', () => {
  it('005-E5: un sistema con menos de seis rotaciones no está completo', () => {
    const sistema = crearSistema('Sistema', plantilla(), [])!;
    const conUna = guardarFormacion(sistema, 2, formacionLegalR2(sistema.plantilla.ordenSaque))!;

    expect(sistemaCompleto(conUna)).toBe(false);
  });

  it('005-E6: un sistema con las seis rotaciones legales está completo', () => {
    let sistema = crearSistema('Sistema', plantilla(), [])!;
    for (let rotacion = 1; rotacion <= 6; rotacion++) {
      sistema = guardarFormacion(sistema, rotacion, formacionLegalPara(sistema.plantilla.ordenSaque, rotacion))!;
    }

    expect(sistemaCompleto(sistema)).toBe(true);
  });
});

describe('borrarRotacion', () => {
  it('005-E11: borrar una rotación ya guardada la deja vacía otra vez', () => {
    const sistema = crearSistema('Sistema', plantilla(), [])!;
    const conR2 = guardarFormacion(sistema, 2, formacionLegalR2(sistema.plantilla.ordenSaque))!;

    const resultado = borrarRotacion(conR2, 2);

    expect(resultado.formaciones[2]).toBeUndefined();
  });

  it('005-E12: borrar una rotación deshace la completitud', () => {
    let sistema = crearSistema('Sistema', plantilla(), [])!;
    for (let rotacion = 1; rotacion <= 6; rotacion++) {
      sistema = guardarFormacion(sistema, rotacion, formacionLegalPara(sistema.plantilla.ordenSaque, rotacion))!;
    }

    const resultado = borrarRotacion(sistema, 3);

    expect(sistemaCompleto(resultado)).toBe(false);
  });
});
