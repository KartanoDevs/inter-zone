import { describe, expect, it } from 'vitest';
import type { Jugador } from './modelos';
import { CONFIGURACION_ROLES_POR_DEFECTO, etiquetaDe, validarConfiguracionRoles } from './roles';

function jugador(id: string, rol: Jugador['rol'], indice?: 1 | 2): Jugador {
  return indice === undefined ? { id, rol } : { id, rol, indice };
}

describe('etiquetaDe', () => {
  it('E1: rol sin índice devuelve solo la abreviatura', () => {
    const colocador = jugador('j1', 'colocador');

    expect(etiquetaDe(colocador, CONFIGURACION_ROLES_POR_DEFECTO)).toBe('C');
  });

  it('E2: rol con índice concatena abreviatura e índice', () => {
    const receptor = jugador('j1', 'receptor', 1);

    expect(etiquetaDe(receptor, CONFIGURACION_ROLES_POR_DEFECTO)).toBe('R1');
  });

  it('E3: el central no colisiona con el colocador', () => {
    const central = jugador('j1', 'central', 2);
    const colocador = jugador('j2', 'colocador');

    expect(etiquetaDe(central, CONFIGURACION_ROLES_POR_DEFECTO)).toBe('M2');
    expect(etiquetaDe(central, CONFIGURACION_ROLES_POR_DEFECTO)).not.toBe(
      etiquetaDe(colocador, CONFIGURACION_ROLES_POR_DEFECTO),
    );
  });

  it('E4: líbero y opuesto se etiquetan L y O', () => {
    const libero = jugador('j1', 'libero');
    const opuesto = jugador('j2', 'opuesto');

    expect(etiquetaDe(libero, CONFIGURACION_ROLES_POR_DEFECTO)).toBe('L');
    expect(etiquetaDe(opuesto, CONFIGURACION_ROLES_POR_DEFECTO)).toBe('O');
  });

  it('E5: renombrar un rol no cambia su identificador', () => {
    const configuracion = {
      ...CONFIGURACION_ROLES_POR_DEFECTO,
      receptor: { nombre: 'Punta', abreviatura: 'P', llevaIndice: true },
    };
    const receptor = jugador('j1', 'receptor', 2);

    expect(etiquetaDe(receptor, configuracion)).toBe('P2');
    expect(receptor.rol).toBe('receptor');
  });
});

describe('validarConfiguracionRoles', () => {
  it('E6: abreviaturas repetidas se rechazan indicando qué roles colisionan', () => {
    const configuracion = {
      ...CONFIGURACION_ROLES_POR_DEFECTO,
      central: { nombre: 'Central', abreviatura: 'C', llevaIndice: true },
    };

    const colisiones = validarConfiguracionRoles(configuracion);

    expect(colisiones).toEqual([{ abreviatura: 'C', roles: ['colocador', 'central'] }]);
  });
});
