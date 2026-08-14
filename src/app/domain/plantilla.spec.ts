import { describe, expect, it } from 'vitest';
import type { Jugador, OrdenSaque } from './modelos';
import { CONFIGURACION_ROLES_POR_DEFECTO } from './roles';
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
  it('E11: el primer jugador del rol tras el colocador recibe el índice 1 y el segundo el 2', () => {
    const central1 = jugador('central1', 'central');
    const colocador = jugador('colocador', 'colocador');
    const receptorA = jugador('receptorA', 'receptor');
    const opuesto = jugador('opuesto', 'opuesto');
    const receptorB = jugador('receptorB', 'receptor');
    const central2 = jugador('central2', 'central');
    const orden: OrdenSaque = [central1, colocador, receptorA, opuesto, receptorB, central2];

    const resultado = asignarIndices(orden, CONFIGURACION_ROLES_POR_DEFECTO);

    expect(resultado.find((j) => j.id === 'receptorA')?.indice).toBe(1);
    expect(resultado.find((j) => j.id === 'receptorB')?.indice).toBe(2);
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
