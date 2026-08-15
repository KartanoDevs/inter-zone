import { describe, expect, it } from 'vitest';
import type { Formacion, Jugador, OrdenSaque, PlantillaEquipo, Sistema } from './modelos';
import { formacionEnRotacion } from './rotacion';
import { guardarFormacionDefensa } from './sistema-defensa';

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

function plantillaConLibero(sustituidoId: string): PlantillaEquipo {
  const sustitutosPorRotacion = { 1: sustituidoId, 2: sustituidoId, 3: sustituidoId, 4: sustituidoId, 5: sustituidoId, 6: sustituidoId };
  return {
    nombre: 'Equipo A',
    ordenSaque: ordenValidoEstandar(),
    libero: { jugador: jugador('libero', 'libero'), sustitutosPorRotacion },
  };
}

const PUNTOS = [
  { x: 8, y: 8 },
  { x: 8, y: 1 },
  { x: 4.5, y: 1 },
  { x: 1, y: 1 },
  { x: 1, y: 6 },
  { x: 4.5, y: 6 },
];

function formacionLegalPara(orden: OrdenSaque, rotacion: number): Formacion {
  const posiciones = formacionEnRotacion(orden, rotacion);
  return posiciones.map((jugador, indice) => ({ jugador, punto: PUNTOS[indice] }));
}

function sistemaDefensaVacio(plantilla: PlantillaEquipo): Sistema {
  return { id: 's1', nombre: 'Sistema', tipo: 'defensa', plantilla, formaciones: {}, explicacionesRotacion: {} };
}

describe('guardarFormacionDefensa', () => {
  it('E9: el roster exigido es el mismo que en recepción, el líbero incluido donde le toque', () => {
    const plantilla = plantillaConLibero('central2');
    const sistema = sistemaDefensaVacio(plantilla);
    // R1: central2 es zaguero en esta plantilla -> en pista debería estar el líbero, no central2.
    const conElTitularEnVezDelLibero = formacionLegalPara(plantilla.ordenSaque, 1);

    const resultado = guardarFormacionDefensa(sistema, 1, 'z4', conElTitularEnVezDelLibero);

    expect(resultado).toBeNull();
  });

  it('E12: una defensa que no coloca a los seis se rechaza', () => {
    const orden = ordenValidoEstandar();
    const sistema = sistemaDefensaVacio({ nombre: 'Equipo A', ordenSaque: orden });
    const incompleta = formacionLegalPara(orden, 1).slice(0, 5) as Formacion;

    const resultado = guardarFormacionDefensa(sistema, 1, 'z4', incompleta);

    expect(resultado).toBeNull();
  });

  it('E13: guardar una defensa la asocia a su rotación y su vía, sin afectar a otras', () => {
    const orden = ordenValidoEstandar();
    const sistema = sistemaDefensaVacio({ nombre: 'Equipo A', ordenSaque: orden });
    const formacion = formacionLegalPara(orden, 1);

    const resultado = guardarFormacionDefensa(sistema, 1, 'z4', formacion)!;

    expect(resultado.defensas?.[1]?.z4).toEqual(formacion);
    expect(resultado.defensas?.[1]?.z3).toBeUndefined();
    expect(resultado.defensas?.[2]).toBeUndefined();
  });
});
