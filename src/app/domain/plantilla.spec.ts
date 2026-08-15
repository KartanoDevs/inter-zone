import { describe, expect, it } from 'vitest';
import type { Jugador, OrdenSaque } from './modelos';
import { CONFIGURACION_ROLES_POR_DEFECTO, etiquetaDe } from './roles';
import { formacionEnRotacion } from './rotacion';
import { validarPlantilla } from './plantilla';

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

describe('índice de rol declarado (spec 018)', () => {
  it('018-E1: el índice de un rol es el que declara la plantilla', () => {
    const [, r1, r2, central1, central2] = ordenValidoEstandar();

    expect(etiquetaDe(r1, CONFIGURACION_ROLES_POR_DEFECTO)).toBe('R1');
    expect(etiquetaDe(r2, CONFIGURACION_ROLES_POR_DEFECTO)).toBe('R2');
    expect(etiquetaDe(central1, CONFIGURACION_ROLES_POR_DEFECTO)).toBe('C1');
    expect(etiquetaDe(central2, CONFIGURACION_ROLES_POR_DEFECTO)).toBe('C2');
  });

  it('018-E3: el índice es del jugador, no de la casilla — rotar no lo cambia', () => {
    const orden: OrdenSaque = [
      jugador('colocador', 'colocador'),
      jugador('receptor1', 'receptor', 1),
      jugador('central1', 'central', 2),
      jugador('opuesto', 'opuesto'),
      jugador('receptor2', 'receptor', 2),
      jugador('central2', 'central', 1),
    ];

    const etiquetasPorRotacion = [1, 2, 3, 4, 5, 6].map((rotacion) => {
      const central2 = formacionEnRotacion(orden, rotacion).find((j) => j.id === 'central2')!;
      return etiquetaDe(central2, CONFIGURACION_ROLES_POR_DEFECTO);
    });

    expect(new Set(etiquetasPorRotacion)).toEqual(new Set(['C1']));
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
