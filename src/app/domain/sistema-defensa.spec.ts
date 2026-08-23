import { describe, expect, it } from 'vitest';
import type { FormacionDefensa, PlantillaEquipo, Sistema } from './modelos';
import { explicarPuesto, explicarVariante, guardarVarianteDefensa } from './sistema-defensa';

function plantillaEstandar(): PlantillaEquipo {
  return {
    nombre: 'Equipo A',
    ordenSaque: [
      { id: 'colocador', rol: 'colocador' },
      { id: 'receptor1', rol: 'receptor', indice: 1 },
      { id: 'receptor2', rol: 'receptor', indice: 2 },
      { id: 'central1', rol: 'central', indice: 1 },
      { id: 'central2', rol: 'central', indice: 2 },
      { id: 'opuesto', rol: 'opuesto' },
    ],
  };
}

function sistemaDefensaVacio(plantilla: PlantillaEquipo): Sistema {
  return { id: 's1', nombre: 'Sistema', tipo: 'defensa', equipoId: 'masculino', plantilla, formaciones: {}, explicacionesRotacion: {} };
}

const PUNTOS = [
  { x: 8, y: 8 },
  { x: 8, y: 1 },
  { x: 4.5, y: 1 },
  { x: 1, y: 1 },
  { x: 1, y: 6 },
  { x: 4.5, y: 6 },
];

function formacionSeisPuestos(): FormacionDefensa {
  return [1, 2, 3, 4, 5, 6].map((puesto, indice) => ({ puesto: puesto as 1 | 2 | 3 | 4 | 5 | 6, punto: PUNTOS[indice] }));
}

describe('guardarVarianteDefensa', () => {
  it('E15: una variante que no coloca a los seis puestos se rechaza', () => {
    const sistema = sistemaDefensaVacio(plantillaEstandar());
    const incompleta = formacionSeisPuestos().slice(0, 5) as FormacionDefensa;

    const resultado = guardarVarianteDefensa(sistema, 'delantero', 'z4', 0, incompleta);

    expect(resultado).toBeNull();
  });

  it('E15: una variante con un puesto repetido se rechaza', () => {
    const sistema = sistemaDefensaVacio(plantillaEstandar());
    const base = formacionSeisPuestos();
    const conRepetido = [...base.slice(0, 5), { ...base[4] }] as FormacionDefensa;

    const resultado = guardarVarianteDefensa(sistema, 'delantero', 'z4', 0, conRepetido);

    expect(resultado).toBeNull();
  });

  it('E16: guardar una defensa la asocia a su caso y su situación, sin afectar a otras', () => {
    const sistema = sistemaDefensaVacio(plantillaEstandar());
    const formacion = formacionSeisPuestos();

    const resultado = guardarVarianteDefensa(sistema, 'delantero', 'z4', 0, formacion)!;

    expect(resultado.defensas).toEqual([{ caso: 'delantero', situacion: 'z4', bloqueadores: 0, formacion }]);
  });

  it('E16: guardar una segunda variante no toca la primera', () => {
    const sistema = sistemaDefensaVacio(plantillaEstandar());
    const formacionZ4 = formacionSeisPuestos();
    const conZ4 = guardarVarianteDefensa(sistema, 'delantero', 'z4', 0, formacionZ4)!;
    const formacionZ3 = formacionSeisPuestos();

    const resultado = guardarVarianteDefensa(conZ4, 'delantero', 'z3', 0, formacionZ3)!;

    expect(resultado.defensas).toHaveLength(2);
    expect(resultado.defensas?.find((v) => v.caso === 'delantero' && v.situacion === 'z4')?.formacion).toEqual(formacionZ4);
    expect(resultado.defensas?.find((v) => v.caso === 'delantero' && v.situacion === 'z3')?.formacion).toEqual(formacionZ3);
  });
});

describe('explicarVariante', () => {
  it('E18: guarda la explicación de conjunto ligada al caso y la situación, no a ninguna rotación', () => {
    const sistema = sistemaDefensaVacio(plantillaEstandar());
    const conVariante = guardarVarianteDefensa(sistema, 'delantero', 'z4', 0, formacionSeisPuestos())!;

    const resultado = explicarVariante(conVariante, 'delantero', 'z4', 0, 'Bloqueo doble por la derecha');

    expect(resultado.defensas?.find((v) => v.caso === 'delantero' && v.situacion === 'z4')?.explicacion).toBe(
      'Bloqueo doble por la derecha',
    );
  });
});

describe('explicarPuesto', () => {
  it('E18: guarda la explicación de un puesto concreto de la variante activa', () => {
    const sistema = sistemaDefensaVacio(plantillaEstandar());
    const conVariante = guardarVarianteDefensa(sistema, 'delantero', 'z4', 0, formacionSeisPuestos())!;

    const resultado = explicarPuesto(conVariante, 'delantero', 'z4', 0, 3, 'Bloquea siempre en el centro');

    const variante = resultado?.defensas?.find((v) => v.caso === 'delantero' && v.situacion === 'z4');
    expect(variante?.formacion.find((c) => c.puesto === 3)?.explicacion).toBe('Bloquea siempre en el centro');
  });
});
