import { describe, expect, it } from 'vitest';
import type { InsigniaGanada } from '../domain/insignias';
import { ErrorDelServidor, type InsigniasRepository } from '../domain/puertos';
import { InsigniasStore } from './insignias.store';

const INSIGNIA: InsigniaGanada = {
  sistemaId: 'sistema-1',
  tipo: 'sistema',
  titularId: null,
  obtenidaEn: '2026-02-12T10:00:00.000Z',
};

function repoFalso(listar: () => Promise<readonly InsigniaGanada[]>): InsigniasRepository {
  return {
    listar,
    registrar: async () => undefined,
  };
}

describe('InsigniasStore', () => {
  it('E12: cargar deja insignias() con lo que devuelve el repositorio y marca cargadas', async () => {
    const store = new InsigniasStore(repoFalso(async () => [INSIGNIA]));

    await store.cargar();

    expect(store.insignias()).toEqual([INSIGNIA]);
    expect(store.cargadas()).toBe(true);
    expect(store.cargando()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('E18: mientras la carga está en curso, cargando() es true y cargadas() sigue false', async () => {
    let resolver: (valor: readonly InsigniaGanada[]) => void = () => {};
    const store = new InsigniasStore(repoFalso(() => new Promise((r) => (resolver = r))));

    const promesa = store.cargar();
    expect(store.cargando()).toBe(true);
    expect(store.cargadas()).toBe(false);

    resolver([]);
    await promesa;
    expect(store.cargando()).toBe(false);
    expect(store.cargadas()).toBe(true);
  });

  it('E19: si la petición falla, error() lo explica y no se marca cargadas', async () => {
    const store = new InsigniasStore(
      repoFalso(async () => {
        throw new ErrorDelServidor('No se pudo conectar con el servidor');
      }),
    );

    await store.cargar();

    expect(store.error()).toBe('No se pudo conectar con el servidor');
    expect(store.cargadas()).toBe(false);
    expect(store.cargando()).toBe(false);
  });

  it('065-E7: cargar de nuevo trae las insignias frescas (una recién ganada aparece)', async () => {
    let insignias: readonly InsigniaGanada[] = [];
    const store = new InsigniasStore(repoFalso(async () => insignias));
    await store.cargar();
    expect(store.insignias()).toEqual([]);

    insignias = [INSIGNIA]; // "se gana una insignia en un examen"
    await store.cargar();

    expect(store.insignias()).toEqual([INSIGNIA]);
  });
});
