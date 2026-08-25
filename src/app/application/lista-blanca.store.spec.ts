import { describe, expect, it } from 'vitest';
import type { InvitacionListada } from '../domain/acceso';
import { CorreoYaRegistrado, type ListaBlancaRepository } from '../domain/puertos';
import { ListaBlancaStore } from './lista-blanca.store';

const INVITACION: InvitacionListada = {
  email: 'nueva@club.com',
  rol: 'usuario',
  equipoId: null,
  creadaEn: '2026-08-25T00:00:00.000Z',
  usadaEn: null,
};

interface RepoFalsoOpciones {
  readonly listar?: () => Promise<readonly InvitacionListada[]>;
  readonly invitar?: () => Promise<void>;
  readonly retirar?: () => Promise<void>;
}

function repoFalso(opciones: RepoFalsoOpciones = {}): ListaBlancaRepository {
  return {
    listar: opciones.listar ?? (async () => []),
    invitar: opciones.invitar ?? (async () => undefined),
    retirar: opciones.retirar ?? (async () => undefined),
  };
}

describe('ListaBlancaStore', () => {
  it('054-E6: cargar deja invitaciones() con lo que devuelve el repositorio', async () => {
    const store = new ListaBlancaStore(repoFalso({ listar: async () => [INVITACION] }));

    await store.cargar();

    expect(store.invitaciones()).toEqual([INVITACION]);
    expect(store.cargando()).toBe(false);
  });

  it('054-E1: invitar con éxito recarga la lista', async () => {
    const store = new ListaBlancaStore(repoFalso({ listar: async () => [INVITACION] }));

    const exito = await store.invitar('nueva@club.com', 'usuario', null);

    expect(exito).toBe(true);
    expect(store.invitaciones()).toEqual([INVITACION]);
  });

  it('054-E3: invitar un correo ya registrado deja un aviso y no toca invitaciones()', async () => {
    const store = new ListaBlancaStore(
      repoFalso({
        invitar: async () => {
          throw new CorreoYaRegistrado('Ese correo ya tiene cuenta');
        },
      }),
    );

    const exito = await store.invitar('x@club.com', 'usuario', null);

    expect(exito).toBe(false);
    expect(store.error()).toBe('Ese correo ya tiene cuenta');
    expect(store.invitaciones()).toEqual([]);
  });

  it('054-E4: retirar recarga la lista', async () => {
    let listado = [INVITACION];
    const store = new ListaBlancaStore(
      repoFalso({
        listar: async () => listado,
        retirar: async () => {
          listado = [];
        },
      }),
    );
    await store.cargar();

    await store.retirar('nueva@club.com');

    expect(store.invitaciones()).toEqual([]);
  });
});
