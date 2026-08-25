import { describe, expect, it } from 'vitest';
import { CredencialesInvalidas, ErrorDeRed, ErrorDelServidor, InvitacionNoDisponible } from '../domain/puertos';
import type { SesionUsuario } from '../domain/acceso';
import { HttpAccesoRepository } from './http-acceso.repository';

interface LlamadaFalsa {
  readonly url: string;
  readonly init: RequestInit | undefined;
}

type Responder = () => Response | never;

function crearFetchFalso(respuestas: readonly Responder[]): { readonly fetchFn: typeof fetch; readonly llamadas: LlamadaFalsa[] } {
  let indice = 0;
  const llamadas: LlamadaFalsa[] = [];
  const fetchFn = (async (url: string, init?: RequestInit) => {
    llamadas.push({ url, init });
    const responder = respuestas[indice++];
    if (!responder) {
      throw new Error('fetchFalso: no hay más respuestas encoladas');
    }
    return responder();
  }) as typeof fetch;
  return { fetchFn, llamadas };
}

function respuestaJson(status: number, cuerpo: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => cuerpo,
    clone(): Response {
      return respuestaJson(status, cuerpo);
    },
  } as unknown as Response;
}

function fallaDeRed(): never {
  throw new TypeError('Failed to fetch (simulado)');
}

const USUARIO: SesionUsuario = { email: 'entrenadora@club.com', esAdmin: false, membresias: [{ equipoId: 'femenino', rol: 'entrenador' }] };

describe('HttpAccesoRepository', () => {
  it('050-E2: entrar con credenciales correctas abre sesión y devuelve quién ha entrado', async () => {
    const { fetchFn, llamadas } = crearFetchFalso([() => respuestaJson(200, { ok: true }), () => respuestaJson(200, { usuario: USUARIO })]);
    const repositorio = new HttpAccesoRepository('http://api', fetchFn);

    const usuario = await repositorio.entrar('entrenadora@club.com', 'contrasena123');

    expect(usuario).toEqual(USUARIO);
    expect(llamadas[0]?.url).toContain('/auth/entrar');
    expect(llamadas[0]?.init?.credentials).toBe('include');
    expect(llamadas[1]?.url).toContain('/auth/quien-soy');
  });

  it('050-E3: entrar con credenciales incorrectas se señala como CredencialesInvalidas', async () => {
    const { fetchFn } = crearFetchFalso([() => respuestaJson(401, { error: 'Correo o contraseña incorrectos' })]);
    const repositorio = new HttpAccesoRepository('http://api', fetchFn);

    await expect(repositorio.entrar('nadie@club.com', 'mala')).rejects.toBeInstanceOf(CredencialesInvalidas);
  });

  it('050-E4: registrar con un correo invitado no lanza', async () => {
    const { fetchFn } = crearFetchFalso([() => respuestaJson(201, { email: 'nueva@club.com' })]);
    const repositorio = new HttpAccesoRepository('http://api', fetchFn);

    await expect(repositorio.registrar('nueva@club.com', 'contrasena123')).resolves.toBeUndefined();
  });

  it('050-E5: registrar sin invitación disponible se señala como InvitacionNoDisponible', async () => {
    const { fetchFn } = crearFetchFalso([() => respuestaJson(403, { error: 'Ese correo no tiene una invitación disponible' })]);
    const repositorio = new HttpAccesoRepository('http://api', fetchFn);

    await expect(repositorio.registrar('nadie@club.com', 'contrasena123')).rejects.toBeInstanceOf(InvitacionNoDisponible);
  });

  it('quienSoy sin sesión devuelve null, sin lanzar (soporta E1/E6/E8)', async () => {
    const { fetchFn } = crearFetchFalso([() => respuestaJson(200, { usuario: null })]);
    const repositorio = new HttpAccesoRepository('http://api', fetchFn);

    await expect(repositorio.quienSoy()).resolves.toBeNull();
  });

  it('050-E7: salir hace la petición de salir', async () => {
    const { fetchFn, llamadas } = crearFetchFalso([() => respuestaJson(204, null)]);
    const repositorio = new HttpAccesoRepository('http://api', fetchFn);

    await repositorio.salir();

    expect(llamadas[0]?.url).toContain('/auth/salir');
  });

  it('un fallo de conexión se señala como ErrorDeRed', async () => {
    const { fetchFn } = crearFetchFalso([fallaDeRed]);
    const repositorio = new HttpAccesoRepository('http://api', fetchFn);

    await expect(repositorio.quienSoy()).rejects.toBeInstanceOf(ErrorDeRed);
  });

  it('un rechazo del servidor que no es de acceso se señala como ErrorDelServidor', async () => {
    const { fetchFn } = crearFetchFalso([() => respuestaJson(400, { error: 'La contraseña es demasiado corta' })]);
    const repositorio = new HttpAccesoRepository('http://api', fetchFn);

    await expect(repositorio.registrar('a@club.com', 'abc')).rejects.toBeInstanceOf(ErrorDelServidor);
  });
});
