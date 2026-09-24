import { describe, expect, it } from 'vitest';
import type { ColocacionDefensa, FormacionDefensa, PlantillaEquipo, Sistema } from './modelos';
import {
  explicarPuesto,
  explicarVariante,
  guardarVarianteDefensa,
  puestosQueBloquean,
} from './sistema-defensa';

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
  return {
    id: 's1',
    nombre: 'Sistema',
    tipo: 'defensa',
    equipoId: 'masculino',
    plantilla,
    formaciones: {},
    explicacionesRotacion: {},
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

function formacionSeisPuestos(): FormacionDefensa {
  return [1, 2, 3, 4, 5, 6].map((puesto, indice) => ({
    puesto: puesto as 1 | 2 | 3 | 4 | 5 | 6,
    punto: PUNTOS[indice],
  }));
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

    expect(resultado.defensas).toEqual([
      { caso: 'delantero', situacion: 'z4', bloqueadores: 0, formacion },
    ]);
  });

  it('E16: guardar una segunda variante no toca la primera', () => {
    const sistema = sistemaDefensaVacio(plantillaEstandar());
    const formacionZ4 = formacionSeisPuestos();
    const conZ4 = guardarVarianteDefensa(sistema, 'delantero', 'z4', 0, formacionZ4)!;
    const formacionZ3 = formacionSeisPuestos();

    const resultado = guardarVarianteDefensa(conZ4, 'delantero', 'z3', 0, formacionZ3)!;

    expect(resultado.defensas).toHaveLength(2);
    expect(
      resultado.defensas?.find((v) => v.caso === 'delantero' && v.situacion === 'z4')?.formacion,
    ).toEqual(formacionZ4);
    expect(
      resultado.defensas?.find((v) => v.caso === 'delantero' && v.situacion === 'z3')?.formacion,
    ).toEqual(formacionZ3);
  });

  it('039-E5: guardar la posición inicial con bloqueadores declarados se rechaza', () => {
    const sistema = sistemaDefensaVacio(plantillaEstandar());

    const resultado = guardarVarianteDefensa(
      sistema,
      'delantero',
      'inicial',
      2,
      formacionSeisPuestos(),
    );

    expect(resultado).toBeNull();
  });

  it('039-E5 (contraejemplo): guardar la posición inicial con 0 bloqueadores se acepta', () => {
    const sistema = sistemaDefensaVacio(plantillaEstandar());

    const resultado = guardarVarianteDefensa(
      sistema,
      'delantero',
      'inicial',
      0,
      formacionSeisPuestos(),
    );

    expect(resultado).not.toBeNull();
  });

  it('040-E10: guardar con un desplazamiento de sombra lo asocia a la variante', () => {
    const sistema = sistemaDefensaVacio(plantillaEstandar());

    const resultado = guardarVarianteDefensa(
      sistema,
      'delantero',
      'z4',
      2,
      formacionSeisPuestos(),
      { x: 1, y: 0.5 },
    )!;

    expect(resultado.defensas?.[0].desplazamientoSombra).toEqual({ x: 1, y: 0.5 });
  });

  it('040-E13: guardar sin desplazamiento (recentrado) lo borra de la variante', () => {
    const sistema: Sistema = {
      ...sistemaDefensaVacio(plantillaEstandar()),
      defensas: [
        {
          caso: 'delantero',
          situacion: 'z4',
          bloqueadores: 2,
          formacion: formacionSeisPuestos(),
          desplazamientoSombra: { x: 1, y: 0.5 },
        },
      ],
    };

    const resultado = guardarVarianteDefensa(
      sistema,
      'delantero',
      'z4',
      2,
      formacionSeisPuestos(),
    )!;

    expect(resultado.defensas?.[0].desplazamientoSombra).toBeUndefined();
  });

  it('E1 (spec 072): guarda el punto exacto donde se suelta la ficha del atacante', () => {
    const sistema = sistemaDefensaVacio(plantillaEstandar());

    const resultado = guardarVarianteDefensa(
      sistema,
      'delantero',
      'z4',
      0,
      formacionSeisPuestos(),
      undefined,
      { x: 7.2, y: -0.8 },
    )!;

    expect(resultado.defensas?.[0].marcadorAtacante).toEqual({ x: 7.2, y: -0.8 });
  });

  it('E1 (spec 073): guarda el punto exacto donde se suelta el central rival', () => {
    const sistema = sistemaDefensaVacio(plantillaEstandar());

    const resultado = guardarVarianteDefensa(
      sistema,
      'delantero',
      'inicial',
      0,
      formacionSeisPuestos(),
      undefined,
      undefined,
      { x: 3.5, y: -2.0 },
    )!;

    expect(resultado.defensas?.[0].marcadorCentral).toEqual({ x: 3.5, y: -2.0 });
  });
});

describe('puestosQueBloquean', () => {
  function conPuesto(puesto: 1 | 2 | 3 | 4 | 5 | 6, y: number): ColocacionDefensa {
    return { puesto, punto: { x: 4.5, y } };
  }

  it('039-E9: con 2 bloqueadores declarados, bloquean los dos delanteros más pegados a la red', () => {
    const formacion: FormacionDefensa = [
      conPuesto(2, 1.5),
      conPuesto(3, 0.4),
      conPuesto(4, 0.8),
      conPuesto(1, 6),
      conPuesto(5, 6),
      conPuesto(6, 8),
    ];

    const puestos = puestosQueBloquean(formacion, 2);

    expect([...puestos].sort()).toEqual([3, 4]);
  });

  it('039-E10: descolgar a un bloqueador a los 3 metros lo saca del bloqueo, sin tocar el número declarado', () => {
    // Mismo escenario que E9, pero el puesto 4 se descuelga a 3.5 m: ahora el 2 es el segundo
    // más cercano a la red.
    const formacion: FormacionDefensa = [
      conPuesto(2, 1.5),
      conPuesto(3, 0.4),
      conPuesto(4, 3.5),
      conPuesto(1, 6),
      conPuesto(5, 6),
      conPuesto(6, 8),
    ];

    const puestos = puestosQueBloquean(formacion, 2);

    expect([...puestos].sort()).toEqual([2, 3]);
  });

  it('039-E11: declarar 3 bloqueadores con solo dos delanteros colocados no inventa un tercero', () => {
    const formacion: FormacionDefensa = [
      conPuesto(3, 0.4),
      conPuesto(4, 0.8),
      conPuesto(1, 6),
      conPuesto(5, 6),
      conPuesto(6, 8),
    ];

    const puestos = puestosQueBloquean(formacion, 3);

    expect([...puestos].sort()).toEqual([3, 4]);
  });

  it('039: con 0 bloqueadores declarados, nadie bloquea', () => {
    const formacion: FormacionDefensa = [
      conPuesto(2, 1.5),
      conPuesto(3, 0.4),
      conPuesto(4, 0.8),
      conPuesto(1, 6),
      conPuesto(5, 6),
      conPuesto(6, 8),
    ];

    expect(puestosQueBloquean(formacion, 0)).toEqual([]);
  });
});

describe('explicarVariante', () => {
  it('E18: guarda la explicación de conjunto ligada al caso y la situación, no a ninguna rotación', () => {
    const sistema = sistemaDefensaVacio(plantillaEstandar());
    const conVariante = guardarVarianteDefensa(
      sistema,
      'delantero',
      'z4',
      0,
      formacionSeisPuestos(),
    )!;

    const resultado = explicarVariante(
      conVariante,
      'delantero',
      'z4',
      0,
      'Bloqueo doble por la derecha',
    );

    expect(
      resultado.defensas?.find((v) => v.caso === 'delantero' && v.situacion === 'z4')?.explicacion,
    ).toBe('Bloqueo doble por la derecha');
  });
});

describe('explicarPuesto', () => {
  it('E18: guarda la explicación de un puesto concreto de la variante activa', () => {
    const sistema = sistemaDefensaVacio(plantillaEstandar());
    const conVariante = guardarVarianteDefensa(
      sistema,
      'delantero',
      'z4',
      0,
      formacionSeisPuestos(),
    )!;

    const resultado = explicarPuesto(
      conVariante,
      'delantero',
      'z4',
      0,
      3,
      'Bloquea siempre en el centro',
    );

    const variante = resultado?.defensas?.find(
      (v) => v.caso === 'delantero' && v.situacion === 'z4',
    );
    expect(variante?.formacion.find((c) => c.puesto === 3)?.explicacion).toBe(
      'Bloquea siempre en el centro',
    );
  });
});
