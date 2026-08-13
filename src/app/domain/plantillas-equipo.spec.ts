import { describe, expect, it } from 'vitest';
import type { Jugador, OrdenSaque, PlantillaEquipo } from './modelos';
import { CONFIGURACION_ROLES_POR_DEFECTO } from './roles';
import { puedeBorrarPlantillaEquipo, puedeCrearPlantillaEquipo } from './plantillas-equipo';

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

describe('puedeCrearPlantillaEquipo', () => {
  it('004-E1: un nombre y un orden de saque válidos se acepta', () => {
    const resultado = puedeCrearPlantillaEquipo(
      'Equipo A',
      ordenValidoEstandar(),
      CONFIGURACION_ROLES_POR_DEFECTO,
      [],
    );

    expect(resultado).toBe(true);
  });

  it('004-E2: nombre vacío se rechaza', () => {
    const resultado = puedeCrearPlantillaEquipo(
      '',
      ordenValidoEstandar(),
      CONFIGURACION_ROLES_POR_DEFECTO,
      [],
    );

    expect(resultado).toBe(false);
  });

  it('004-E3: dos plantillas con el mismo nombre se rechaza', () => {
    const existente: PlantillaEquipo = { nombre: 'Equipo A', ordenSaque: ordenValidoEstandar() };

    const resultado = puedeCrearPlantillaEquipo(
      'Equipo A',
      ordenValidoEstandar(),
      CONFIGURACION_ROLES_POR_DEFECTO,
      [existente],
    );

    expect(resultado).toBe(false);
  });

  it('004-E4: composición de roles inválida se rechaza', () => {
    const [colocador, r1, , central1, central2, opuesto] = ordenValidoEstandar();
    const dosColocadores: OrdenSaque = [colocador, colocador, r1, central1, central2, opuesto];

    const resultado = puedeCrearPlantillaEquipo(
      'Equipo A',
      dosColocadores,
      CONFIGURACION_ROLES_POR_DEFECTO,
      [],
    );

    expect(resultado).toBe(false);
  });
});

describe('puedeBorrarPlantillaEquipo', () => {
  it('004-E5: una plantilla sin sistemas asociados se puede borrar', () => {
    expect(puedeBorrarPlantillaEquipo(false)).toBe(true);
  });

  it('004-E6: una plantilla en uso no se puede borrar', () => {
    expect(puedeBorrarPlantillaEquipo(true)).toBe(false);
  });
});
