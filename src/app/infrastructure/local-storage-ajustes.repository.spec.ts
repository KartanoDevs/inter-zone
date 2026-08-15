import { describe, expect, it } from 'vitest';
import type { AlmacenClaveValor } from './local-storage-sistema.repository';
import { LocalStorageAjustesRepository } from './local-storage-ajustes.repository';

class AlmacenEnMemoria implements AlmacenClaveValor {
  private readonly valores = new Map<string, string>();

  getItem(clave: string): string | null {
    return this.valores.get(clave) ?? null;
  }

  setItem(clave: string, valor: string): void {
    this.valores.set(clave, valor);
  }
}

const AJUSTES_POR_DEFECTO = {
  validacionDesactivada: false,
  ayudaPosicionDesactivada: false,
  ordenRotacionCronologico: false,
  mostrarNumerosMetros: false,
};

describe('LocalStorageAjustesRepository', () => {
  it('sin nada guardado, todos los ajustes están en su valor por defecto', () => {
    const repositorio = new LocalStorageAjustesRepository(new AlmacenEnMemoria());

    expect(repositorio.leer()).toEqual(AJUSTES_POR_DEFECTO);
  });

  it('ida y vuelta sin pérdida', () => {
    const repositorio = new LocalStorageAjustesRepository(new AlmacenEnMemoria());
    const ajustes = {
      validacionDesactivada: true,
      ayudaPosicionDesactivada: true,
      ordenRotacionCronologico: true,
      mostrarNumerosMetros: true,
    };

    repositorio.guardar(ajustes);

    expect(repositorio.leer()).toEqual(ajustes);
  });

  it('datos corruptos no interrumpen la lectura y devuelven el valor por defecto', () => {
    const almacen = new AlmacenEnMemoria();
    almacen.setItem('interzone.ajustes', 'esto no es json{');
    const repositorio = new LocalStorageAjustesRepository(almacen);

    expect(() => repositorio.leer()).not.toThrow();
    expect(repositorio.leer()).toEqual(AJUSTES_POR_DEFECTO);
  });

  it('una versión desconocida se ignora y devuelve el valor por defecto', () => {
    const almacen = new AlmacenEnMemoria();
    almacen.setItem(
      'interzone.ajustes',
      JSON.stringify({
        version: 999,
        data: {
          validacionDesactivada: true,
          ayudaPosicionDesactivada: true,
          ordenRotacionCronologico: true,
          mostrarNumerosMetros: true,
        },
      }),
    );
    const repositorio = new LocalStorageAjustesRepository(almacen);

    expect(repositorio.leer()).toEqual(AJUSTES_POR_DEFECTO);
  });

  it('una versión 2 con forma incompatible (sin ordenRotacionCronologico) tampoco se lee a ciegas', () => {
    const almacen = new AlmacenEnMemoria();
    almacen.setItem(
      'interzone.ajustes',
      JSON.stringify({ version: 2, data: { validacionDesactivada: true, ayudaPosicionDesactivada: true } }),
    );
    const repositorio = new LocalStorageAjustesRepository(almacen);

    expect(() => repositorio.leer()).not.toThrow();
    expect(repositorio.leer()).toEqual(AJUSTES_POR_DEFECTO);
  });

  it('una versión 3 con forma incompatible (sin mostrarNumerosMetros) tampoco se lee a ciegas', () => {
    const almacen = new AlmacenEnMemoria();
    almacen.setItem(
      'interzone.ajustes',
      JSON.stringify({
        version: 3,
        data: { validacionDesactivada: true, ayudaPosicionDesactivada: true, ordenRotacionCronologico: true },
      }),
    );
    const repositorio = new LocalStorageAjustesRepository(almacen);

    expect(() => repositorio.leer()).not.toThrow();
    expect(repositorio.leer()).toEqual(AJUSTES_POR_DEFECTO);
  });
});
