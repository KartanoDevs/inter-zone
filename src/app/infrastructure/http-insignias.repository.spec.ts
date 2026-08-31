import { describe, expect, it } from 'vitest';
import type { InsigniaGanada } from '../domain/insignias';
import { ErrorDelServidor } from '../domain/puertos';
import { HttpInsigniasRepository } from './http-insignias.repository';

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

const INSIGNIA: InsigniaGanada = {
  sistemaId: 'sistema-1',
  tipo: 'puesto',
  titularId: 'receptor1',
  obtenidaEn: '2026-08-26T00:00:00.000Z',
};

describe('HttpInsigniasRepository', () => {
  it('056-E4: listar devuelve las insignias tal cual', async () => {
    const { fetchFn } = crearFetchFalso([() => respuestaJson(200, [INSIGNIA])]);
    const repositorio = new HttpInsigniasRepository('http://api', fetchFn);

    await expect(repositorio.listar()).resolves.toEqual([INSIGNIA]);
  });

  it('056-E1: registrar manda sistemaId, tipo y titularId', async () => {
    const { fetchFn, llamadas } = crearFetchFalso([() => respuestaJson(201, { ok: true })]);
    const repositorio = new HttpInsigniasRepository('http://api', fetchFn);

    await repositorio.registrar('sistema-1', 'puesto', 'receptor1');

    expect(JSON.parse(llamadas[0]?.init?.body as string)).toEqual({
      sistemaId: 'sistema-1',
      tipo: 'puesto',
      titularId: 'receptor1',
    });
  });

  it('056-E1b: registrar un examen por sistema manda titularId null', async () => {
    const { fetchFn, llamadas } = crearFetchFalso([() => respuestaJson(201, { ok: true })]);
    const repositorio = new HttpInsigniasRepository('http://api', fetchFn);

    await repositorio.registrar('sistema-1', 'sistema', null);

    expect(JSON.parse(llamadas[0]?.init?.body as string)).toEqual({
      sistemaId: 'sistema-1',
      tipo: 'sistema',
      titularId: null,
    });
  });

  it('056-E7: sin sesión, el servidor rechaza y se señala como ErrorDelServidor', async () => {
    const { fetchFn } = crearFetchFalso([
      () => respuestaJson(401, { error: 'Hace falta iniciar sesión' }),
    ]);
    const repositorio = new HttpInsigniasRepository('http://api', fetchFn);

    await expect(repositorio.listar()).rejects.toBeInstanceOf(ErrorDelServidor);
  });
});
