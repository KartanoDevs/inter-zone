import { describe, expect, it } from 'vitest';
import type { UsuarioListado } from '../domain/acceso';
import { ErrorDelServidor, UltimoAdminNoSePuedeBorrar } from '../domain/puertos';
import { HttpUsuariosRepository } from './http-usuarios.repository';

type Responder = () => Response | never;

function crearFetchFalso(respuestas: readonly Responder[]): {
  readonly fetchFn: typeof fetch;
  readonly llamadas: { url: string; init?: RequestInit }[];
} {
  let indice = 0;
  const llamadas: { url: string; init?: RequestInit }[] = [];
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

const USUARIO: UsuarioListado = { id: 'u1', email: 'jugador@club.com', esAdmin: false };

describe('HttpUsuariosRepository', () => {
  it('068-E5: listar devuelve las cuentas tal cual', async () => {
    const { fetchFn } = crearFetchFalso([() => respuestaJson(200, [USUARIO])]);
    const repositorio = new HttpUsuariosRepository('http://api', fetchFn);

    await expect(repositorio.listar()).resolves.toEqual([USUARIO]);
  });

  it('068-E1: borrar hace la petición DELETE con el id en la ruta', async () => {
    const { fetchFn, llamadas } = crearFetchFalso([() => respuestaJson(204, null)]);
    const repositorio = new HttpUsuariosRepository('http://api', fetchFn);

    await repositorio.borrar('u1');

    expect(llamadas[0]?.url).toContain('/usuarios/u1');
  });

  it('068-E3: borrar al último admin se señala como UltimoAdminNoSePuedeBorrar', async () => {
    const { fetchFn } = crearFetchFalso([
      () => respuestaJson(409, { error: 'No se puede borrar al último admin' }),
    ]);
    const repositorio = new HttpUsuariosRepository('http://api', fetchFn);

    await expect(repositorio.borrar('u1')).rejects.toBeInstanceOf(UltimoAdminNoSePuedeBorrar);
  });

  it('068-E6: un rechazo por rol insuficiente se señala como ErrorDelServidor', async () => {
    const { fetchFn } = crearFetchFalso([
      () => respuestaJson(403, { error: 'Solo el admin gestiona las cuentas' }),
    ]);
    const repositorio = new HttpUsuariosRepository('http://api', fetchFn);

    await expect(repositorio.listar()).rejects.toBeInstanceOf(ErrorDelServidor);
  });
});
