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

describe('LocalStorageAjustesRepository', () => {
  it('sin nada guardado, la validación está activada y la ayuda de posición visible por defecto', () => {
    const repositorio = new LocalStorageAjustesRepository(new AlmacenEnMemoria());

    expect(repositorio.leer()).toEqual({ validacionDesactivada: false, ayudaPosicionDesactivada: false });
  });

  it('ida y vuelta sin pérdida', () => {
    const repositorio = new LocalStorageAjustesRepository(new AlmacenEnMemoria());

    repositorio.guardar({ validacionDesactivada: true, ayudaPosicionDesactivada: true });

    expect(repositorio.leer()).toEqual({ validacionDesactivada: true, ayudaPosicionDesactivada: true });
  });

  it('datos corruptos no interrumpen la lectura y devuelven el valor por defecto', () => {
    const almacen = new AlmacenEnMemoria();
    almacen.setItem('interzone.ajustes', 'esto no es json{');
    const repositorio = new LocalStorageAjustesRepository(almacen);

    expect(() => repositorio.leer()).not.toThrow();
    expect(repositorio.leer()).toEqual({ validacionDesactivada: false, ayudaPosicionDesactivada: false });
  });

  it('una versión desconocida se ignora y devuelve el valor por defecto', () => {
    const almacen = new AlmacenEnMemoria();
    almacen.setItem(
      'interzone.ajustes',
      JSON.stringify({ version: 999, data: { validacionDesactivada: true, ayudaPosicionDesactivada: true } }),
    );
    const repositorio = new LocalStorageAjustesRepository(almacen);

    expect(repositorio.leer()).toEqual({ validacionDesactivada: false, ayudaPosicionDesactivada: false });
  });

  it('una versión 1 con forma incompatible (sin ayudaPosicionDesactivada) tampoco se lee a ciegas', () => {
    const almacen = new AlmacenEnMemoria();
    almacen.setItem('interzone.ajustes', JSON.stringify({ version: 1, data: { validacionDesactivada: true } }));
    const repositorio = new LocalStorageAjustesRepository(almacen);

    expect(() => repositorio.leer()).not.toThrow();
    expect(repositorio.leer()).toEqual({ validacionDesactivada: false, ayudaPosicionDesactivada: false });
  });
});
