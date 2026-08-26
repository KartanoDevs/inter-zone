import { describe, expect, it } from 'vitest';
import type { Formacion, Jugador, OrdenSaque, PlantillaEquipo, Sistema } from './modelos';
import { formacionEnRotacion, jugadoresEnPista } from './rotacion';
import { jugadoresAColocar } from './examen';

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

function formacionLegalPara(orden: OrdenSaque, rotacion: number): Formacion {
  const posiciones = formacionEnRotacion(orden, rotacion);
  return posiciones.map((jugador, indice) => ({ jugador, punto: PUNTOS_LEGALES[indice] }));
}

function sistemaConSeisFormaciones(plantillaEquipo: PlantillaEquipo): Sistema {
  const formaciones: Record<number, Formacion> = {};
  for (const rotacion of [1, 2, 3, 4, 5, 6]) {
    formaciones[rotacion] = formacionLegalPara(plantillaEquipo.ordenSaque, rotacion);
  }
  return {
    id: 'sistema-1',
    nombre: 'Sistema',
    tipo: 'recepcion',
    equipoId: 'masculino',
    plantilla: plantillaEquipo,
    formaciones,
    explicacionesRotacion: {},
    estado: 'validado',
  };
}

describe('jugadoresAColocar', () => {
  it('012-E1: en el examen por puesto solo toca colocar al titular examinado', () => {
    const sistema = sistemaConSeisFormaciones(plantilla());
    const examen = { tipo: 'puesto' as const, titularId: 'receptor1' };

    const resultado = jugadoresAColocar(examen, sistema, 1);

    expect(resultado).toEqual([jugador('receptor1', 'receptor', 1)]);
  });
});
