import { describe, expect, it } from 'vitest';
import type { InvitacionListada } from '../domain/acceso';
import { CorreoYaRegistrado, ErrorDelServidor } from '../domain/puertos';
import { HttpListaBlancaRepository } from './http-lista-blanca.repository';

type Responder = () => Response | never;

function crearFetchFalso(respuestas: readonly Responder[]): { readonly fetchFn: typeof fetch; readonly llamadas: { url: string; init?: RequestInit }[] } {
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

const INVITACION: InvitacionListada = {
  email: 'nueva@club.com',
  rol: 'entrenador',
  equipoId: 'femenino',
  creadaEn: '2026-08-25T00:00:00.000Z',
  usadaEn: null,
};

describe('HttpListaBlancaRepository', () => {
  it('054-E6: listar devuelve las invitaciones tal cual', async () => {
    const { fetchFn } = crearFetchFalso([() => respuestaJson(200, [INVITACION])]);
    const repositorio = new HttpListaBlancaRepository('http://api', fetchFn);

    await expect(repositorio.listar()).resolves.toEqual([INVITACION]);
  });

  it('054-E1: invitar manda email, rol y equipoId', async () => {
    const { fetchFn, llamadas } = crearFetchFalso([() => respuestaJson(201, { ok: true })]);
    const repositorio = new HttpListaBlancaRepository('http://api', fetchFn);

    await repositorio.invitar('nueva@club.com', 'entrenador', 'femenino');

    expect(JSON.parse(llamadas[0]?.init?.body as string)).toEqual({
      email: 'nueva@club.com',
      rol: 'entrenador',
      equipoId: 'femenino',
    });
  });

  it('054-E3: invitar un correo ya registrado se señala como CorreoYaRegistrado', async () => {
    const { fetchFn } = crearFetchFalso([() => respuestaJson(409, { error: 'Ese correo ya tiene cuenta' })]);
    const repositorio = new HttpListaBlancaRepository('http://api', fetchFn);

    await expect(repositorio.invitar('x@club.com', 'usuario', null)).rejects.toBeInstanceOf(CorreoYaRegistrado);
  });

  it('054-E7: un rechazo por rol insuficiente se señala como ErrorDelServidor', async () => {
    const { fetchFn } = crearFetchFalso([() => respuestaJson(403, { error: 'Solo el admin gestiona la lista blanca' })]);
    const repositorio = new HttpListaBlancaRepository('http://api', fetchFn);

    await expect(repositorio.listar()).rejects.toBeInstanceOf(ErrorDelServidor);
  });

  it('054-E4: retirar hace la petición DELETE con el correo en la ruta', async () => {
    const { fetchFn, llamadas } = crearFetchFalso([() => respuestaJson(204, null)]);
    const repositorio = new HttpListaBlancaRepository('http://api', fetchFn);

    await repositorio.retirar('nueva@club.com');

    expect(llamadas[0]?.url).toContain('/lista-blanca/nueva%40club.com');
  });
});
