import { describe, expect, it } from 'vitest';
import {
  LocalStorageAjustesRepository,
  type AlmacenClaveValor,
} from './local-storage-ajustes.repository';

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
  escalaSombra: 5,
};

describe('LocalStorageAjustesRepository', () => {
  it('sin nada guardado, todos los ajustes están en su valor por defecto', async () => {
    const repositorio = new LocalStorageAjustesRepository(new AlmacenEnMemoria());

    expect(await repositorio.leer()).toEqual(AJUSTES_POR_DEFECTO);
  });

  it('ida y vuelta sin pérdida', async () => {
    const repositorio = new LocalStorageAjustesRepository(new AlmacenEnMemoria());
    const ajustes = {
      validacionDesactivada: true,
      ayudaPosicionDesactivada: true,
      ordenRotacionCronologico: true,
      mostrarNumerosMetros: true,
      escalaSombra: 8,
    };

    await repositorio.guardar(ajustes);

    expect(await repositorio.leer()).toEqual(ajustes);
  });

  it('datos corruptos no interrumpen la lectura y devuelven el valor por defecto', async () => {
    const almacen = new AlmacenEnMemoria();
    almacen.setItem('interzone.ajustes', 'esto no es json{');
    const repositorio = new LocalStorageAjustesRepository(almacen);

    await expect(repositorio.leer()).resolves.not.toThrow();
    expect(await repositorio.leer()).toEqual(AJUSTES_POR_DEFECTO);
  });

  it('una versión desconocida se ignora y devuelve el valor por defecto', async () => {
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
          escalaSombra: 8,
        },
      }),
    );
    const repositorio = new LocalStorageAjustesRepository(almacen);

    expect(await repositorio.leer()).toEqual(AJUSTES_POR_DEFECTO);
  });

  it('una versión 2 con forma incompatible (sin ordenRotacionCronologico) tampoco se lee a ciegas', async () => {
    const almacen = new AlmacenEnMemoria();
    almacen.setItem(
      'interzone.ajustes',
      JSON.stringify({
        version: 2,
        data: { validacionDesactivada: true, ayudaPosicionDesactivada: true },
      }),
    );
    const repositorio = new LocalStorageAjustesRepository(almacen);

    await expect(repositorio.leer()).resolves.not.toThrow();
    expect(await repositorio.leer()).toEqual(AJUSTES_POR_DEFECTO);
  });

  it('una versión 3 con forma incompatible (sin mostrarNumerosMetros) tampoco se lee a ciegas', async () => {
    const almacen = new AlmacenEnMemoria();
    almacen.setItem(
      'interzone.ajustes',
      JSON.stringify({
        version: 3,
        data: {
          validacionDesactivada: true,
          ayudaPosicionDesactivada: true,
          ordenRotacionCronologico: true,
        },
      }),
    );
    const repositorio = new LocalStorageAjustesRepository(almacen);

    await expect(repositorio.leer()).resolves.not.toThrow();
    expect(await repositorio.leer()).toEqual(AJUSTES_POR_DEFECTO);
  });

  it('044-E5/E8: una versión 4 con forma incompatible (sin escalaSombra) tampoco se lee a ciegas', async () => {
    const almacen = new AlmacenEnMemoria();
    almacen.setItem(
      'interzone.ajustes',
      JSON.stringify({
        version: 4,
        data: {
          validacionDesactivada: true,
          ayudaPosicionDesactivada: true,
          ordenRotacionCronologico: true,
          mostrarNumerosMetros: true,
        },
      }),
    );
    const repositorio = new LocalStorageAjustesRepository(almacen);

    await expect(repositorio.leer()).resolves.not.toThrow();
    expect(await repositorio.leer()).toEqual(AJUSTES_POR_DEFECTO);
  });

  it('045-E8: una versión 5 con escalaSombra en el rango antiguo (0-100) no se reinterpreta, se descarta', async () => {
    const almacen = new AlmacenEnMemoria();
    almacen.setItem(
      'interzone.ajustes',
      JSON.stringify({
        version: 5,
        data: {
          validacionDesactivada: true,
          ayudaPosicionDesactivada: true,
          ordenRotacionCronologico: true,
          mostrarNumerosMetros: true,
          escalaSombra: 75,
        },
      }),
    );
    const repositorio = new LocalStorageAjustesRepository(almacen);

    await expect(repositorio.leer()).resolves.not.toThrow();
    expect(await repositorio.leer()).toEqual(AJUSTES_POR_DEFECTO);
  });
});
