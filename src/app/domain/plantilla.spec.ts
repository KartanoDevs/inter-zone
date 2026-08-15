import { describe, expect, it } from 'vitest';
import type { Jugador, OrdenSaque } from './modelos';
import { CONFIGURACION_ROLES_POR_DEFECTO, etiquetaDe } from './roles';
import { formacionEnRotacion } from './rotacion';
import { asignarIndices, validarPlantilla } from './plantilla';

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

describe('validarPlantilla', () => {
  it('E7: un rol con índice sin índice asignado es inválido', () => {
    const [colocador, r1, r2, central1, central2, opuesto] = ordenValidoEstandar();
    const centralSinIndice = jugador('central1', 'central');
    const orden: OrdenSaque = [colocador, r1, r2, centralSinIndice, central2, opuesto];

    expect(validarPlantilla(orden, CONFIGURACION_ROLES_POR_DEFECTO)).toBe(false);
  });

  it('E8: un rol sin índice con índice asignado es inválido', () => {
    const [, r1, r2, central1, central2, opuesto] = ordenValidoEstandar();
    const colocadorConIndice = jugador('colocador', 'colocador', 1);
    const orden: OrdenSaque = [colocadorConIndice, r1, r2, central1, central2, opuesto];

    expect(validarPlantilla(orden, CONFIGURACION_ROLES_POR_DEFECTO)).toBe(false);
  });

  it('E9: índices duplicados dentro del mismo rol son inválidos', () => {
    const [colocador, r1, , central1, central2, opuesto] = ordenValidoEstandar();
    const r2ConIndiceDuplicado = jugador('receptor2', 'receptor', 1);
    const orden: OrdenSaque = [colocador, r1, r2ConIndiceDuplicado, central1, central2, opuesto];

    expect(validarPlantilla(orden, CONFIGURACION_ROLES_POR_DEFECTO)).toBe(false);
  });

  it('E10: índices iguales en roles distintos son válidos', () => {
    const orden = ordenValidoEstandar();

    expect(validarPlantilla(orden, CONFIGURACION_ROLES_POR_DEFECTO)).toBe(true);
  });
});

describe('asignarIndices', () => {
  it('017-E1: el índice se cuenta en el sentido en que gira la rotación (P1,P6,P5,P4,P3,P2)', () => {
    const orden = ordenValidoEstandar();

    const resultado = asignarIndices(orden, CONFIGURACION_ROLES_POR_DEFECTO);

    // R1 (orden ya empieza con el colocador): P1..P6 = colocador, receptor1, receptor2,
    // central1, central2, opuesto. Sentido de rotación desde el colocador: P1, P6, P5, P4,
    // P3, P2 = colocador, opuesto, central2, central1, receptor2, receptor1. El primer
    // central en ese recorrido es central2 -> índice 1; central1 -> índice 2.
    expect(resultado.find((j) => j.id === 'central2')?.indice).toBe(1);
    expect(resultado.find((j) => j.id === 'central1')?.indice).toBe(2);
  });

  it('017-E2: con la plantilla típica del 5-1, el central que arranca en zaga es el índice 1 (C1)', () => {
    const orden: OrdenSaque = [
      jugador('colocador', 'colocador'), // P1
      jugador('receptor1', 'receptor'), // P2
      jugador('central1', 'central'), // P3 (delantero)
      jugador('opuesto', 'opuesto'), // P4
      jugador('receptor2', 'receptor'), // P5
      jugador('central2', 'central'), // P6 (zaguero)
    ];

    const resultado = asignarIndices(orden, CONFIGURACION_ROLES_POR_DEFECTO);

    expect(resultado.find((j) => j.id === 'central2')?.indice).toBe(1);
    expect(resultado.find((j) => j.id === 'central1')?.indice).toBe(2);
  });

  it('017-E3: el índice es del jugador, no de la casilla — rotar no lo cambia', () => {
    const orden: OrdenSaque = [
      jugador('colocador', 'colocador'),
      jugador('receptor1', 'receptor'),
      jugador('central1', 'central'),
      jugador('opuesto', 'opuesto'),
      jugador('receptor2', 'receptor'),
      jugador('central2', 'central'),
    ];
    const conIndices = asignarIndices(orden, CONFIGURACION_ROLES_POR_DEFECTO);

    const etiquetasPorRotacion = [1, 2, 3, 4, 5, 6].map((rotacion) => {
      const central2 = formacionEnRotacion(conIndices, rotacion).find((j) => j.id === 'central2')!;
      return etiquetaDe(central2, CONFIGURACION_ROLES_POR_DEFECTO);
    });

    expect(new Set(etiquetasPorRotacion)).toEqual(new Set(['C1']));
  });

  it('E11 (revisa 002-E11, girada por 017-E1): el primer jugador del rol en sentido de rotación desde el colocador recibe el índice 1, el segundo el 2', () => {
    const central1 = jugador('central1', 'central');
    const colocador = jugador('colocador', 'colocador');
    const receptorA = jugador('receptorA', 'receptor');
    const opuesto = jugador('opuesto', 'opuesto');
    const receptorB = jugador('receptorB', 'receptor');
    const central2 = jugador('central2', 'central');
    const orden: OrdenSaque = [central1, colocador, receptorA, opuesto, receptorB, central2];

    const resultado = asignarIndices(orden, CONFIGURACION_ROLES_POR_DEFECTO);

    // R1 de este orden: P1..P6 = colocador, receptorA, opuesto, receptorB, central2, central1.
    // Sentido de rotación desde el colocador: colocador, central1, central2, receptorB,
    // opuesto, receptorA. El primer receptor en ese recorrido es receptorB -> índice 1.
    expect(resultado.find((j) => j.id === 'receptorB')?.indice).toBe(1);
    expect(resultado.find((j) => j.id === 'receptorA')?.indice).toBe(2);
  });
});

describe('validarPlantilla — composición', () => {
  it('E12: composición estándar (1 colocador, 2 receptores, 2 centrales, 1 opuesto) es válida', () => {
    const orden = ordenValidoEstandar();

    expect(validarPlantilla(orden, CONFIGURACION_ROLES_POR_DEFECTO)).toBe(true);
  });

  it('011-E13 (revisa 002-E13): un líbero dentro del orden de saque ya no es válido — vive aparte', () => {
    const orden: OrdenSaque = [
      jugador('colocador', 'colocador'),
      jugador('receptor1', 'receptor', 1),
      jugador('receptor2', 'receptor', 2),
      jugador('central1', 'central', 1),
      jugador('libero', 'libero'),
      jugador('opuesto', 'opuesto'),
    ];

    expect(validarPlantilla(orden, CONFIGURACION_ROLES_POR_DEFECTO)).toBe(false);
  });

  it('E14: dos colocadores en pista es una composición inválida', () => {
    const orden: OrdenSaque = [
      jugador('colocador1', 'colocador'),
      jugador('colocador2', 'colocador'),
      jugador('receptor1', 'receptor', 1),
      jugador('central1', 'central', 1),
      jugador('central2', 'central', 2),
      jugador('opuesto', 'opuesto'),
    ];

    expect(validarPlantilla(orden, CONFIGURACION_ROLES_POR_DEFECTO)).toBe(false);
  });

  it('E15: un jugador repetido en dos posiciones es inválido', () => {
    const [colocador, , , central1, central2, opuesto] = ordenValidoEstandar();
    const mismoJugadorEnDosPuestos1 = jugador('receptorX', 'receptor', 1);
    const mismoJugadorEnDosPuestos2 = jugador('receptorX', 'receptor', 2);
    const orden: OrdenSaque = [
      colocador,
      mismoJugadorEnDosPuestos1,
      mismoJugadorEnDosPuestos2,
      central1,
      central2,
      opuesto,
    ];

    expect(validarPlantilla(orden, CONFIGURACION_ROLES_POR_DEFECTO)).toBe(false);
  });
});
