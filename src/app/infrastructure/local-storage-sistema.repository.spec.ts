import { describe, expect, it } from 'vitest';
import type { Jugador, OrdenSaque, PlantillaEquipo, Sistema } from '../domain/modelos';
import { LocalStorageSistemaRepository, type AlmacenClaveValor } from './local-storage-sistema.repository';

class AlmacenEnMemoria implements AlmacenClaveValor {
  private readonly valores = new Map<string, string>();

  getItem(clave: string): string | null {
    return this.valores.get(clave) ?? null;
  }

  setItem(clave: string, valor: string): void {
    this.valores.set(clave, valor);
  }
}

function jugador(id: string, rol: Jugador['rol'], indice?: 1 | 2): Jugador {
  return indice === undefined ? { id, rol } : { id, rol, indice };
}

function ordenConCentral2(): OrdenSaque {
  return [
    jugador('colocador', 'colocador'),
    jugador('receptor1', 'receptor', 1),
    jugador('receptor2', 'receptor', 2),
    jugador('central1', 'central', 1),
    jugador('central2', 'central', 2),
    jugador('opuesto', 'opuesto'),
  ];
}

function ordenConLibero(): OrdenSaque {
  return [
    jugador('colocador', 'colocador'),
    jugador('receptor1', 'receptor', 1),
    jugador('receptor2', 'receptor', 2),
    jugador('central1', 'central', 1),
    jugador('libero', 'libero'),
    jugador('opuesto', 'opuesto'),
  ];
}

const PLANTILLAS: Readonly<Record<'central2' | 'libero', PlantillaEquipo>> = {
  central2: { nombre: 'Equipo A', ordenSaque: ordenConCentral2() },
  libero: { nombre: 'Equipo A', ordenSaque: ordenConLibero() },
};

function sistema(id: string, nombre: string): Sistema {
  const [colocador] = PLANTILLAS.central2.ordenSaque;
  return {
    id,
    nombre,
    tipo: 'recepcion',
    plantilla: PLANTILLAS.central2,
    formaciones: { 2: [{ jugador: colocador, punto: { x: 8, y: 1 } }] },
    explicacionesRotacion: {},
  };
}

function crearRepositorio(almacen: AlmacenClaveValor = new AlmacenEnMemoria()): LocalStorageSistemaRepository {
  return new LocalStorageSistemaRepository(almacen, PLANTILLAS);
}

describe('LocalStorageSistemaRepository', () => {
  it('008-E1: ida y vuelta sin pérdida', () => {
    const repositorio = crearRepositorio();
    const original = [sistema('s1', 'Uno'), sistema('s2', 'Dos')];

    repositorio.guardar(original);
    const resultado = repositorio.listar();

    expect(resultado).toEqual(original);
  });

  it('008-E2: un almacén vacío devuelve una lista vacía sin error', () => {
    const repositorio = crearRepositorio();

    expect(repositorio.listar()).toEqual([]);
  });

  it('008-E3: datos corruptos no interrumpen el arranque', () => {
    const almacen = new AlmacenEnMemoria();
    almacen.setItem('interzone.sistemas', 'esto no es json{');
    const repositorio = crearRepositorio(almacen);

    expect(() => repositorio.listar()).not.toThrow();
    expect(repositorio.listar()).toEqual([]);
  });

  it('008-E4: una versión futura desconocida no se sobrescribe al leer', () => {
    const almacen = new AlmacenEnMemoria();
    const bruto = JSON.stringify({ version: 999, data: { sistemas: ['dato de una versión futura'] } });
    almacen.setItem('interzone.sistemas', bruto);
    const repositorio = crearRepositorio(almacen);

    const resultado = repositorio.listar();

    expect(resultado).toEqual([]);
    expect(almacen.getItem('interzone.sistemas')).toBe(bruto);
  });

  it('008-E5: borrar un sistema y guardar el resto lo quita al releer', () => {
    const repositorio = crearRepositorio();
    repositorio.guardar([sistema('s1', 'Uno'), sistema('s2', 'Dos')]);

    repositorio.guardar([sistema('s2', 'Dos')]);
    const resultado = repositorio.listar();

    expect(resultado.map((s) => s.id)).toEqual(['s2']);
  });

  it('008-E6: los decimales de las coordenadas llegan exactos', () => {
    const repositorio = crearRepositorio();
    const [colocador] = PLANTILLAS.central2.ordenSaque;
    const conDecimales: Sistema = {
      ...sistema('s1', 'Uno'),
      formaciones: { 2: [{ jugador: colocador, punto: { x: 4.53, y: 1.8 } }] },
    };

    repositorio.guardar([conDecimales]);
    const resultado = repositorio.listar();

    expect(resultado[0]?.formaciones[2]?.[0]?.punto).toEqual({ x: 4.53, y: 1.8 });
  });

  it('008-E7: las explicaciones de rotación y de jugador sobreviven', () => {
    const repositorio = crearRepositorio();
    const [colocador] = PLANTILLAS.central2.ordenSaque;
    const conExplicaciones: Sistema = {
      ...sistema('s1', 'Uno'),
      formaciones: { 2: [{ jugador: colocador, punto: { x: 8, y: 1 }, explicacion: 'Explicación del jugador' }] },
      explicacionesRotacion: { 2: 'Explicación de la rotación' },
    };

    repositorio.guardar([conExplicaciones]);
    const resultado = repositorio.listar();

    expect(resultado[0]?.explicacionesRotacion[2]).toBe('Explicación de la rotación');
    expect(resultado[0]?.formaciones[2]?.[0]?.explicacion).toBe('Explicación del jugador');
  });

  it('008-E8: lo escrito tiene la forma {version, data}', () => {
    const almacen = new AlmacenEnMemoria();
    const repositorio = crearRepositorio(almacen);

    repositorio.guardar([sistema('s1', 'Uno')]);
    const guardado = JSON.parse(almacen.getItem('interzone.sistemas')!);

    expect(Object.keys(guardado).sort()).toEqual(['data', 'version']);
    expect(guardado.version).toBe(1);
    expect(Array.isArray(guardado.data.sistemas)).toBe(true);
  });

  it('008-E9: la fecha de creación se fija una sola vez', () => {
    const almacen = new AlmacenEnMemoria();
    let tiempo = 't1';
    const repositorio = new LocalStorageSistemaRepository(almacen, PLANTILLAS, () => tiempo);

    repositorio.guardar([sistema('s1', 'Uno')]);
    tiempo = 't2';
    repositorio.guardar([sistema('s1', 'Uno (renombrado)')]);

    const guardado = JSON.parse(almacen.getItem('interzone.sistemas')!);
    expect(guardado.data.sistemas[0].creadoEn).toBe('t1');
  });

  it('008-E10: la fecha de modificación cambia con cada guardado', () => {
    const almacen = new AlmacenEnMemoria();
    let tiempo = 't1';
    const repositorio = new LocalStorageSistemaRepository(almacen, PLANTILLAS, () => tiempo);

    repositorio.guardar([sistema('s1', 'Uno')]);
    tiempo = 't2';
    repositorio.guardar([sistema('s1', 'Uno (renombrado)')]);

    const guardado = JSON.parse(almacen.getItem('interzone.sistemas')!);
    expect(guardado.data.sistemas[0].actualizadoEn).toBe('t2');
    expect(guardado.data.sistemas[0].creadoEn).toBe('t1');
  });
});
