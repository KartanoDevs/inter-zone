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

const PLANTILLA: PlantillaEquipo = {
  nombre: 'Equipo A',
  ordenSaque: ordenConCentral2(),
  libero: {
    jugador: jugador('libero', 'libero'),
    sustitutosPorRotacion: { 1: 'central2', 2: 'central2', 3: null, 4: null, 5: null, 6: 'central2' },
  },
};

function sistema(id: string, nombre: string): Sistema {
  const [colocador] = PLANTILLA.ordenSaque;
  return {
    id,
    nombre,
    tipo: 'recepcion',
    plantilla: PLANTILLA,
    formaciones: { 2: [{ jugador: colocador, punto: { x: 8, y: 1 } }] },
    explicacionesRotacion: {},
  };
}

function crearRepositorio(almacen: AlmacenClaveValor = new AlmacenEnMemoria()): LocalStorageSistemaRepository {
  return new LocalStorageSistemaRepository(almacen, PLANTILLA);
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

  it('008-E4b: una versión anterior con forma incompatible tampoco se lee a ciegas', () => {
    // Forma real de antes de la spec 011: el líbero como discriminador `ocupanteCasilla`,
    // no como `sustitutoLibero`. Sin migración implementada, se trata como no legible —
    // igual que una versión futura — en vez de intentar leerla con las reglas nuevas.
    const almacen = new AlmacenEnMemoria();
    const bruto = JSON.stringify({
      version: 1,
      data: {
        sistemas: [
          {
            id: 's1',
            nombre: 'De antes de la 011',
            tipo: 'recepcion',
            ocupanteCasilla: 'libero',
            formaciones: {},
            explicacionesRotacion: {},
            creadoEn: 't1',
            actualizadoEn: 't1',
          },
        ],
      },
    });
    almacen.setItem('interzone.sistemas', bruto);
    const repositorio = crearRepositorio(almacen);

    expect(() => repositorio.listar()).not.toThrow();
    expect(repositorio.listar()).toEqual([]);
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
    const [colocador] = PLANTILLA.ordenSaque;
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
    const [colocador] = PLANTILLA.ordenSaque;
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
    expect(guardado.version).toBe(3);
    expect(Array.isArray(guardado.data.sistemas)).toBe(true);
  });

  it('008-E4c (añadido en 017): una versión 2 con forma incompatible (sustitutoLibero único) tampoco se lee a ciegas', () => {
    // Forma real de la spec 011: un único `sustitutoLibero` para las seis rotaciones, no
    // `sustitutosLibero` por rotación (spec 017). Mismo motivo que 008-E4b: sin migración
    // real, se trata como no legible en vez de interpretarla con las reglas nuevas.
    const almacen = new AlmacenEnMemoria();
    const bruto = JSON.stringify({
      version: 2,
      data: {
        sistemas: [
          {
            id: 's1',
            nombre: 'De la spec 011',
            tipo: 'recepcion',
            sustitutoLibero: 'central2',
            formaciones: {},
            explicacionesRotacion: {},
            creadoEn: 't1',
            actualizadoEn: 't1',
          },
        ],
      },
    });
    almacen.setItem('interzone.sistemas', bruto);
    const repositorio = crearRepositorio(almacen);

    expect(() => repositorio.listar()).not.toThrow();
    expect(repositorio.listar()).toEqual([]);
    expect(almacen.getItem('interzone.sistemas')).toBe(bruto);
  });

  it('008-E9: la fecha de creación se fija una sola vez', () => {
    const almacen = new AlmacenEnMemoria();
    let tiempo = 't1';
    const repositorio = new LocalStorageSistemaRepository(almacen, PLANTILLA, () => tiempo);

    repositorio.guardar([sistema('s1', 'Uno')]);
    tiempo = 't2';
    repositorio.guardar([sistema('s1', 'Uno (renombrado)')]);

    const guardado = JSON.parse(almacen.getItem('interzone.sistemas')!);
    expect(guardado.data.sistemas[0].creadoEn).toBe('t1');
  });

  it('008-E10: la fecha de modificación cambia con cada guardado', () => {
    const almacen = new AlmacenEnMemoria();
    let tiempo = 't1';
    const repositorio = new LocalStorageSistemaRepository(almacen, PLANTILLA, () => tiempo);

    repositorio.guardar([sistema('s1', 'Uno')]);
    tiempo = 't2';
    repositorio.guardar([sistema('s1', 'Uno (renombrado)')]);

    const guardado = JSON.parse(almacen.getItem('interzone.sistemas')!);
    expect(guardado.data.sistemas[0].actualizadoEn).toBe('t2');
    expect(guardado.data.sistemas[0].creadoEn).toBe('t1');
  });
});
