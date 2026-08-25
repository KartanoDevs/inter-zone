import { describe, expect, it } from 'vitest';
import type { EquipoId, Jugador, OrdenSaque, PlantillaEquipo, Sistema } from '../domain/modelos';
import type { SistemaRepository } from '../domain/puertos';
import { SistemaStore } from './sistema.store';
import { TeoriaStore } from './teoria.store';

function jugador(id: string, rol: Jugador['rol'], indice?: 1 | 2): Jugador {
  return indice === undefined ? { id, rol } : { id, rol, indice };
}

function ordenSaque(): OrdenSaque {
  return [
    jugador('colocador', 'colocador'),
    jugador('receptor1', 'receptor', 1),
    jugador('receptor2', 'receptor', 2),
    jugador('central1', 'central', 1),
    jugador('central2', 'central', 2),
    jugador('opuesto', 'opuesto'),
  ];
}

const PLANTILLA: PlantillaEquipo = { nombre: 'Equipo', ordenSaque: ordenSaque() };

function sistema(id: string, nombre: string, equipoId: EquipoId, opciones: Partial<Sistema> = {}): Sistema {
  return {
    id,
    nombre,
    tipo: 'recepcion',
    equipoId,
    plantilla: PLANTILLA,
    formaciones: {},
    explicacionesRotacion: {},
    ...opciones,
  };
}

/** Nunca se llama en estos tests: TeoriaStore solo lee `SistemaStore.sistemas()`, poblado a
 * mano en cada test sin pasar por `cargar()`. */
const REPOSITORIO_SIN_USAR: SistemaRepository = {
  listar: async () => [],
  crear: async () => {},
  actualizar: async () => {},
  cambiarEstado: async () => {},
  borrar: async () => {},
};

function crearTeoriaStore(sistemas: readonly Sistema[]): TeoriaStore {
  const sistemaStore = new SistemaStore(REPOSITORIO_SIN_USAR);
  sistemaStore.sistemas.set(sistemas);
  return new TeoriaStore(sistemaStore);
}

describe('TeoriaStore', () => {
  it('052-E1: solo lista los sistemas validados del equipo activo', () => {
    const teoria = crearTeoriaStore([
      sistema('v1', 'Validado', 'masculino', { estado: 'validado' }),
      sistema('b1', 'Borrador', 'masculino'),
      sistema('v2', 'De femenino', 'femenino', { estado: 'validado' }),
    ]);

    expect(teoria.catalogo().map((s) => s.id)).toEqual(['v1']);
  });

  it('052-E2: un equipo sin nada validado tiene el catálogo vacío', () => {
    const teoria = crearTeoriaStore([sistema('b1', 'Borrador', 'masculino')]);

    expect(teoria.catalogo()).toEqual([]);
    expect(teoria.sistemaActivo()).toBeNull();
  });

  it('052-E3: recorrer las rotaciones cambia la formación y la explicación mostradas', () => {
    const validado = sistema('v1', 'Recepción', 'masculino', {
      estado: 'validado',
      formaciones: {
        1: [{ jugador: jugador('colocador', 'colocador'), punto: { x: 1, y: 1 } }],
        2: [{ jugador: jugador('colocador', 'colocador'), punto: { x: 2, y: 2 } }],
      },
      explicacionesRotacion: { 1: 'Explicación de R1', 2: 'Explicación de R2' },
    });
    const teoria = crearTeoriaStore([validado]);
    teoria.activarSistema('v1');

    expect(teoria.formacionActiva()).toEqual(validado.formaciones[1]);
    expect(teoria.explicacionMostrada()).toBe('Explicación de R1');

    teoria.seleccionarRotacion(2);

    expect(teoria.formacionActiva()).toEqual(validado.formaciones[2]);
    expect(teoria.explicacionMostrada()).toBe('Explicación de R2');
  });

  it('052-E3: una rotación nunca guardada deja formacionActiva en null, no una pista vacía silenciosa', () => {
    const validado = sistema('v1', 'Recepción', 'masculino', { estado: 'validado' });
    const teoria = crearTeoriaStore([validado]);
    teoria.activarSistema('v1');

    expect(teoria.formacionActiva()).toBeNull();
  });

  it('052-E4: cambiar caso, situación y bloqueadores cambia la variante de defensa mostrada', () => {
    const validado = sistema('v1', 'Defensa', 'masculino', {
      tipo: 'defensa',
      estado: 'validado',
      defensas: [
        {
          caso: 'delantero',
          situacion: 'z4',
          bloqueadores: 1,
          formacion: [{ puesto: 1, punto: { x: 1, y: 1 } }],
          explicacion: 'Variante z4 con 1 bloqueador',
        },
      ],
    });
    const teoria = crearTeoriaStore([validado]);
    teoria.activarSistema('v1');
    teoria.seleccionarSituacion('z4');

    expect(teoria.formacionActiva()).toBeNull(); // 0 bloqueadores por defecto, esa combinación no existe

    teoria.seleccionarBloqueadores(1);

    expect(teoria.formacionActiva()).toEqual(validado.defensas![0].formacion);
    expect(teoria.explicacionMostrada()).toBe('Variante z4 con 1 bloqueador');
  });

  it('052-E8: cambiar de equipo activa el primer sistema validado del equipo nuevo, o ninguno', () => {
    const teoria = crearTeoriaStore([
      sistema('v1', 'De masculino', 'masculino', { estado: 'validado' }),
      sistema('v2', 'De femenino', 'femenino', { estado: 'validado' }),
    ]);
    teoria.activarSistema('v1');

    teoria.seleccionarEquipo('femenino');
    expect(teoria.sistemaActivoId()).toBe('v2');

    teoria.seleccionarEquipo('masculino');
    teoria.activarSistema(null);
    const soloFemenino = crearTeoriaStore([sistema('v2', 'De femenino', 'femenino', { estado: 'validado' })]);
    soloFemenino.seleccionarEquipo('masculino');
    expect(soloFemenino.sistemaActivoId()).toBeNull();
  });

  it('052-E9: la navegación de Teoría no toca el borrador del editor', () => {
    const sistemaStore = new SistemaStore(REPOSITORIO_SIN_USAR);
    const validado = sistema('v1', 'Recepción', 'masculino', { estado: 'validado' });
    sistemaStore.sistemas.set([validado]);
    sistemaStore.sistemaActivoId.set('v1');
    sistemaStore.colocarOMover('colocador', { x: 3, y: 3 });
    const borradorAntes = sistemaStore.borrador();

    const teoria = new TeoriaStore(sistemaStore);
    teoria.activarSistema('v1');
    teoria.seleccionarRotacion(3);

    expect(sistemaStore.borrador()).toEqual(borradorAntes);
  });
});
