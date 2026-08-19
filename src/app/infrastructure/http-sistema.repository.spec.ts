import { describe, expect, it } from 'vitest';
import type { Jugador, OrdenSaque, PlantillaEquipo, Sistema } from '../domain/modelos';
import { ConflictoDeEdicion, ErrorDelServidor, ErrorDeRed } from '../domain/puertos';
import { HttpSistemaRepository } from './http-sistema.repository';

function jugador(id: string, rol: Jugador['rol'], indice?: 1 | 2): Jugador {
  return indice === undefined ? { id, rol } : { id, rol, indice };
}

function ordenSaque(): OrdenSaque {
  return [
    jugador('colocador', 'colocador'),
    jugador('receptor1', 'receptor', 1),
    jugador('receptor2', 'receptor', 2),
    jugador('central1', 'central', 1),
    jugador('central2', 'central', 2),
    jugador('opuesto', 'opuesto'),
  ];
}

const PLANTILLA: PlantillaEquipo = { nombre: 'Equipo', ordenSaque: ordenSaque() };

function sistema(id: string, nombre: string): Sistema {
  return { id, nombre, tipo: 'recepcion', equipoId: 'masculino', plantilla: PLANTILLA, formaciones: {}, explicacionesRotacion: {} };
}

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

describe('HttpSistemaRepository', () => {
  describe('spec 033 (traducción de la API)', () => {
    it('034-E1: listar pide los dos equipos y devuelve el catálogo completo', async () => {
      const masculino = { ...sistema('m1', 'De masculino'), actualizadoEn: 't1' };
      const femenino = { ...sistema('f1', 'De femenino'), actualizadoEn: 't2' };
      const { fetchFn, llamadas } = crearFetchFalso([
        () => respuestaJson(200, [masculino]),
        () => respuestaJson(200, [femenino]),
      ]);
      const repositorio = new HttpSistemaRepository('http://api', fetchFn);

      const resultado = await repositorio.listar();

      expect(resultado.map((s) => s.id)).toEqual(['m1', 'f1']);
      expect(resultado[0]).not.toHaveProperty('actualizadoEn'); // metadato de infraestructura, no del dominio
      expect(llamadas[0]?.url).toContain('equipoId=masculino');
      expect(llamadas[1]?.url).toContain('equipoId=femenino');
    });

    it('034-E2: un fallo de conexión se señala como ErrorDeRed', async () => {
      const { fetchFn } = crearFetchFalso([fallaDeRed]);
      const repositorio = new HttpSistemaRepository('http://api', fetchFn);

      await expect(repositorio.crear(sistema('s1', 'Uno'))).rejects.toBeInstanceOf(ErrorDeRed);
    });

    it('034-E3: un rechazo del servidor se señala como ErrorDelServidor, con su motivo', async () => {
      const { fetchFn } = crearFetchFalso([() => respuestaJson(400, { error: 'Roster inválido en R1' })]);
      const repositorio = new HttpSistemaRepository('http://api', fetchFn);

      await expect(repositorio.crear(sistema('s1', 'Uno'))).rejects.toThrow('Roster inválido en R1');
      await expect(new HttpSistemaRepository('http://api', crearFetchFalso([() => respuestaJson(400, {})]).fetchFn).crear(sistema('s1', 'Uno'))).rejects.toBeInstanceOf(
        ErrorDelServidor,
      );
    });

    it('034-E4: un conflicto de edición (409) se señala como ConflictoDeEdicion, no como ErrorDelServidor', async () => {
      const { fetchFn } = crearFetchFalso([() => respuestaJson(409, { error: 'Alguien más ha modificado este sistema mientras tanto' })]);
      const repositorio = new HttpSistemaRepository('http://api', fetchFn);

      await expect(repositorio.actualizar(sistema('s1', 'Uno'))).rejects.toBeInstanceOf(ConflictoDeEdicion);
    });
  });

  describe('el fetchFn por defecto', () => {
    it('sobrevive a invocarse como this.fetchFn(...), como hace la clase internamente', async () => {
      // Un navegador real exige que `fetch` se llame con `this === window`; llamado como
      // método de otro objeto (`this.fetchFn(...)`), lanza síncronamente "Illegal invocation"
      // antes de tocar la red. Node no reproduce esa exigencia (por eso este test no puede
      // usar directamente `fetch` global de Node: no fallaría ni con el bug presente), así
      // que se simula aquí el mismo contrato que exige un navegador.
      const fetchOriginal = globalThis.fetch;
      globalThis.fetch = function (this: unknown): Promise<Response> {
        if (this !== globalThis) {
          throw new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation");
        }
        return Promise.resolve(respuestaJson(200, []));
      } as typeof fetch;

      try {
        const repositorio = new HttpSistemaRepository('http://api');
        await expect(repositorio.listar()).resolves.toBeDefined();
      } finally {
        globalThis.fetch = fetchOriginal;
      }
    });
  });

  describe('el testigo de concurrencia', () => {
    it('crear guarda el actualizadoEn que devuelve el servidor, para el próximo PUT', async () => {
      const { fetchFn, llamadas } = crearFetchFalso([
        () => respuestaJson(201, { ...sistema('s1', 'Uno'), actualizadoEn: 'marca-1' }),
        () => respuestaJson(200, { actualizadoEn: 'marca-2' }),
      ]);
      const repositorio = new HttpSistemaRepository('http://api', fetchFn);

      await repositorio.crear(sistema('s1', 'Uno'));
      await repositorio.actualizar({ ...sistema('s1', 'Uno'), nombre: 'Uno renombrado' });

      const cabeceras = llamadas[1]?.init?.headers as Record<string, string>;
      expect(cabeceras['If-Match']).toBe('marca-1');
    });

    it('listar guarda el actualizadoEn de cada sistema leído, para el próximo PUT', async () => {
      const { fetchFn, llamadas } = crearFetchFalso([
        () => respuestaJson(200, [{ ...sistema('s1', 'Uno'), actualizadoEn: 'marca-original' }]),
        () => respuestaJson(200, []),
        () => respuestaJson(200, { actualizadoEn: 'marca-nueva' }),
      ]);
      const repositorio = new HttpSistemaRepository('http://api', fetchFn);
      await repositorio.listar();

      await repositorio.actualizar(sistema('s1', 'Uno'));

      const cabeceras = llamadas[2]?.init?.headers as Record<string, string>;
      expect(cabeceras['If-Match']).toBe('marca-original');
    });

    it('borrar olvida el testigo del sistema borrado', async () => {
      const { fetchFn } = crearFetchFalso([
        () => respuestaJson(201, { ...sistema('s1', 'Uno'), actualizadoEn: 'marca-1' }),
        () => respuestaJson(204, null),
      ]);
      const repositorio = new HttpSistemaRepository('http://api', fetchFn);
      await repositorio.crear(sistema('s1', 'Uno'));

      await expect(repositorio.borrar('s1')).resolves.not.toThrow();
    });
  });
});
