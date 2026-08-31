import { describe, expect, it } from 'vitest';
import type { DatosPerfil, SesionUsuario } from '../domain/acceso';
import {
  CredencialesInvalidas,
  ErrorDelServidor,
  InvitacionNoDisponible,
  type AccesoRepository,
} from '../domain/puertos';
import { AccesoStore } from './acceso.store';

const USUARIO: SesionUsuario = {
  email: 'entrenadora@club.com',
  esAdmin: false,
  membresias: [{ equipoId: 'femenino', rol: 'entrenador' }],
  nombre: null,
  posicionFavorita: null,
  dorsal: null,
};

interface RepoFalsoOpciones {
  readonly quienSoy?: () => Promise<SesionUsuario | null>;
  readonly entrar?: () => Promise<SesionUsuario>;
  readonly registrar?: () => Promise<void>;
  readonly salir?: () => Promise<void>;
  readonly actualizarPerfil?: () => Promise<void>;
  readonly cambiarContrasena?: () => Promise<void>;
}

function repoFalso(opciones: RepoFalsoOpciones = {}): AccesoRepository {
  return {
    quienSoy: opciones.quienSoy ?? (async () => null),
    entrar: opciones.entrar ?? (async () => USUARIO),
    registrar: opciones.registrar ?? (async () => undefined),
    salir: opciones.salir ?? (async () => undefined),
    actualizarPerfil: opciones.actualizarPerfil ?? (async () => undefined),
    cambiarContrasena: opciones.cambiarContrasena ?? (async () => undefined),
  };
}

describe('AccesoStore', () => {
  it('050-E1/E8: al construir, cargando() es true y usuario() es null hasta que resuelve comprobarSesion', async () => {
    let resolver!: (usuario: SesionUsuario | null) => void;
    const pendiente = new Promise<SesionUsuario | null>((r) => (resolver = r));
    const store = new AccesoStore(repoFalso({ quienSoy: () => pendiente }));

    const comprobacion = store.comprobarSesion();
    expect(store.cargando()).toBe(true);
    expect(store.usuario()).toBeNull();

    resolver(null);
    await comprobacion;

    expect(store.cargando()).toBe(false);
    expect(store.usuario()).toBeNull();
  });

  it('050-E6: comprobarSesion con una sesión ya viva deja usuario() con sus datos', async () => {
    const store = new AccesoStore(repoFalso({ quienSoy: async () => USUARIO }));

    await store.comprobarSesion();

    expect(store.usuario()).toEqual(USUARIO);
    expect(store.cargando()).toBe(false);
  });

  it('050-E2: entrar con credenciales correctas deja usuario() con quién ha entrado', async () => {
    const store = new AccesoStore(repoFalso({ entrar: async () => USUARIO }));

    await store.entrar('entrenadora@club.com', 'contrasena123');

    expect(store.usuario()).toEqual(USUARIO);
    expect(store.error()).toBeNull();
  });

  it('050-E3: entrar con credenciales incorrectas deja usuario() en null con un aviso', async () => {
    const store = new AccesoStore(
      repoFalso({
        entrar: async () => {
          throw new CredencialesInvalidas('Correo o contraseña incorrectos');
        },
      }),
    );

    await store.entrar('nadie@club.com', 'mala');

    expect(store.usuario()).toBeNull();
    expect(store.error()).toBe('Correo o contraseña incorrectos');
  });

  it('050-E4: crearCuenta con un correo invitado deja usuario() con quién ha entrado, sin pedir la contraseña otra vez', async () => {
    const registros: string[] = [];
    const store = new AccesoStore(
      repoFalso({
        registrar: async () => {
          registros.push('registrar');
        },
        entrar: async () => {
          registros.push('entrar');
          return USUARIO;
        },
      }),
    );

    await store.crearCuenta('nueva@club.com', 'contrasena123');

    expect(store.usuario()).toEqual(USUARIO);
    expect(registros).toEqual(['registrar', 'entrar']);
  });

  it('050-E5: crearCuenta sin invitación disponible deja usuario() en null con un aviso', async () => {
    const store = new AccesoStore(
      repoFalso({
        registrar: async () => {
          throw new InvitacionNoDisponible('Ese correo no tiene una invitación disponible');
        },
      }),
    );

    await store.crearCuenta('nadie@club.com', 'contrasena123');

    expect(store.usuario()).toBeNull();
    expect(store.error()).toBe('Ese correo no tiene una invitación disponible');
  });

  it('050-E7: salir deja usuario() en null', async () => {
    const store = new AccesoStore(repoFalso({ entrar: async () => USUARIO }));
    await store.entrar('entrenadora@club.com', 'contrasena123');

    await store.salir();

    expect(store.usuario()).toBeNull();
  });

  it('053-E2: actualizarPerfil con éxito refleja los nuevos datos en usuario()', async () => {
    const store = new AccesoStore(repoFalso({ entrar: async () => USUARIO }));
    await store.entrar('entrenadora@club.com', 'contrasena123');
    const datos: DatosPerfil = { nombre: 'Ana', posicionFavorita: 'colocador', dorsal: 7 };

    const exito = await store.actualizarPerfil(datos);

    expect(exito).toBe(true);
    expect(store.usuario()).toMatchObject(datos);
    expect(store.error()).toBeNull();
  });

  it('053-E4: actualizarPerfil rechazado por el servidor deja un aviso y no toca usuario()', async () => {
    const store = new AccesoStore(
      repoFalso({
        entrar: async () => USUARIO,
        actualizarPerfil: async () => {
          throw new ErrorDelServidor('dorsal debe estar entre 1 y 99');
        },
      }),
    );
    await store.entrar('entrenadora@club.com', 'contrasena123');

    const exito = await store.actualizarPerfil({
      nombre: null,
      posicionFavorita: null,
      dorsal: 150,
    });

    expect(exito).toBe(false);
    expect(store.error()).toBe('dorsal debe estar entre 1 y 99');
    expect(store.usuario()?.dorsal).toBeNull();
  });

  it('053-E7: cambiarContrasena con la actual incorrecta deja un aviso', async () => {
    const store = new AccesoStore(
      repoFalso({
        cambiarContrasena: async () => {
          throw new CredencialesInvalidas('La contraseña actual no es correcta');
        },
      }),
    );

    const exito = await store.cambiarContrasena('mala', 'nuevaclave123');

    expect(exito).toBe(false);
    expect(store.error()).toBe('La contraseña actual no es correcta');
  });

  it('053-E7: cambiarContrasena con éxito no deja ningún aviso', async () => {
    const store = new AccesoStore(repoFalso());

    const exito = await store.cambiarContrasena('contrasena123', 'nuevaclave123');

    expect(exito).toBe(true);
    expect(store.error()).toBeNull();
  });
});
