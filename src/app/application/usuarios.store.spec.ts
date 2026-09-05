import { describe, expect, it } from 'vitest';
import type { UsuarioListado } from '../domain/acceso';
import { UltimoAdminNoSePuedeBorrar, type UsuariosRepository } from '../domain/puertos';
import { UsuariosStore } from './usuarios.store';

const USUARIO: UsuarioListado = { id: 'u1', email: 'jugador@club.com', esAdmin: false };

interface RepoFalsoOpciones {
  readonly listar?: () => Promise<readonly UsuarioListado[]>;
  readonly borrar?: () => Promise<void>;
}

function repoFalso(opciones: RepoFalsoOpciones = {}): UsuariosRepository {
  return {
    listar: opciones.listar ?? (async () => []),
    borrar: opciones.borrar ?? (async () => undefined),
  };
}

describe('UsuariosStore', () => {
  it('068-E5: cargar deja usuarios() con lo que devuelve el repositorio', async () => {
    const store = new UsuariosStore(repoFalso({ listar: async () => [USUARIO] }));

    await store.cargar();

    expect(store.usuarios()).toEqual([USUARIO]);
    expect(store.cargando()).toBe(false);
  });

  it('068-E1: borrar con éxito recarga la lista', async () => {
    let listado = [USUARIO];
    const store = new UsuariosStore(
      repoFalso({
        listar: async () => listado,
        borrar: async () => {
          listado = [];
        },
      }),
    );
    await store.cargar();

    await store.borrar('u1');

    expect(store.usuarios()).toEqual([]);
  });

  it('068-E3: borrar al último admin deja un aviso y no toca usuarios()', async () => {
    const store = new UsuariosStore(
      repoFalso({
        listar: async () => [USUARIO],
        borrar: async () => {
          throw new UltimoAdminNoSePuedeBorrar('No se puede borrar al último admin');
        },
      }),
    );
    await store.cargar();

    await store.borrar('u1');

    expect(store.error()).toBe('No se puede borrar al último admin');
    expect(store.usuarios()).toEqual([USUARIO]);
  });
});
