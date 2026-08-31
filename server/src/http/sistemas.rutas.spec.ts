import type { Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { EquipoId, Formacion, Sistema, TipoSistema } from '../../../src/app/domain/modelos';
import { PLANTILLA_GLOBAL } from '../../../src/app/domain/plantilla-global';
import { jugadoresEnPista } from '../../../src/app/domain/rotacion';
import { sistemaPorDefecto } from '../../../src/app/domain/sistema-por-defecto';
import { sistemaDefensaPorDefecto } from '../../../src/app/domain/sistema-defensa-por-defecto';
import { prisma } from '../infraestructura/prisma';
import { sembrarCatalogoBase, sembrarEjemplos } from '../infraestructura/semilla';
import { crearServidor } from './servidor';

/**
 * Tests de integración contra un Postgres real (spec 033) — requieren `npm run db:up` y la
 * migración aplicada (`npx prisma migrate deploy`). No entran en el `npm test` de la raíz.
 */

let servidor: Server;
let base: string;

beforeAll(async () => {
  await sembrarCatalogoBase();
  servidor = crearServidor().listen(0);
  await new Promise<void>((resolve) => servidor.once('listening', resolve));
  const direccion = servidor.address();
  if (!direccion || typeof direccion === 'string') {
    throw new Error('No se pudo levantar el servidor de pruebas');
  }
  base = `http://127.0.0.1:${direccion.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => servidor.close(() => resolve()));
  await prisma.$disconnect();
});

/** Sesión de admin válida para cualquier equipo (spec 037): las rutas de escritura la exigen
 * desde esta spec, y la mayoría de los tests de aquí solo quieren un catálogo que manipular,
 * no ejercitar el permiso en sí — eso lo hace el describe "permisos" con sus propias sesiones. */
let cookieAdmin: string;

beforeEach(async () => {
  // Cascada de FK: borra sistema_rotacion, formacion y colocacion también. equipo y jugador,
  // el catálogo base, se quedan.
  await prisma.sistema.deleteMany({});
  // Spec 051: las cuentas que crean los tests de "validar" no deben arrastrarse de un test a otro.
  await prisma.usuario.deleteMany({});
  await prisma.lista_blanca.deleteMany({});
  cookieAdmin = await entrarComo('admin@club.com', 'admin');
});

/** Da de alta y entra con un correo nuevo, invitado con el rol y equipo que se le pida (spec
 * 051). Devuelve la cabecera `Cookie` lista para usar en la siguiente petición. */
async function entrarComo(
  email: string,
  rol: 'admin' | 'entrenador' | 'usuario',
  equipoClave?: EquipoId,
): Promise<string> {
  const equipoId = equipoClave
    ? (await prisma.equipo.findUniqueOrThrow({ where: { clave: equipoClave } })).id
    : null;
  await prisma.lista_blanca.create({ data: { email, rol, equipo_id: equipoId } });
  await fetch(`${base}/api/auth/registro`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, contrasena: 'contrasena123' }),
  });
  const respuesta = await fetch(`${base}/api/auth/entrar`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, contrasena: 'contrasena123' }),
  });
  const testigo = /iz_sesion=([^;]*)/.exec(respuesta.headers.get('set-cookie') ?? '')?.[1];
  if (!testigo) {
    throw new Error('No se obtuvo cookie de sesión');
  }
  return `iz_sesion=${testigo}`;
}

async function ponerEstado(
  id: string,
  estado: 'validado' | 'borrador',
  cookie?: string,
): Promise<{ readonly status: number }> {
  const respuesta = await fetch(`${base}/api/sistemas/${id}/estado`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ estado }),
  });
  return { status: respuesta.status };
}

function sistemaVacio(id: string, nombre: string, tipo: TipoSistema, equipoId: EquipoId): Sistema {
  return {
    id,
    nombre,
    tipo,
    equipoId,
    plantilla: PLANTILLA_GLOBAL,
    formaciones: {},
    explicacionesRotacion: {},
  };
}

function formacionValida(rotacion: 1 | 2 | 3 | 4 | 5 | 6): Formacion {
  return jugadoresEnPista(PLANTILLA_GLOBAL, rotacion).map((jugador, indice) => ({
    jugador,
    punto: { x: indice, y: indice },
  }));
}

interface RespuestaJson {
  readonly status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly cuerpo: any;
}

async function postSistema(
  sistema: Sistema,
  cookie: string | null = cookieAdmin,
): Promise<RespuestaJson> {
  const respuesta = await fetch(`${base}/api/sistemas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(sistema),
  });
  return { status: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

async function putSistema(
  id: string,
  sistema: object,
  testigoIfMatch: string,
  cookie: string | null = cookieAdmin,
): Promise<RespuestaJson> {
  const respuesta = await fetch(`${base}/api/sistemas/${id}`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      'If-Match': testigoIfMatch,
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(sistema),
  });
  return { status: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getCatalogo(equipoId: EquipoId): Promise<any[]> {
  const respuesta = await fetch(`${base}/api/sistemas?equipoId=${equipoId}`);
  return (await respuesta.json()) as any[];
}

async function borrarSistema(
  id: string,
  cookie: string | null = cookieAdmin,
): Promise<RespuestaJson> {
  const respuesta = await fetch(`${base}/api/sistemas/${id}`, {
    method: 'DELETE',
    headers: cookie ? { cookie } : {},
  });
  return { status: respuesta.status, cuerpo: null };
}

/** Una `Formacion` es un conjunto de seis colocaciones, no una secuencia — el orden en que
 * Postgres las devuelve no tiene por qué coincidir con el del dominio. Se ordena por id de
 * jugador antes de comparar. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizarFormaciones(
  formaciones: Readonly<Record<string, readonly any[]>>,
): Record<string, any[]> {
  const resultado: Record<string, unknown[]> = {};
  for (const [clave, formacion] of Object.entries(formaciones)) {
    resultado[clave] = [...formacion].sort((a, b) => a.jugador.id.localeCompare(b.jugador.id));
  }
  return resultado;
}

/** `defensas` es una lista de variantes (spec 038), no una secuencia con orden significativo:
 * se ordena por (caso, situación, bloqueadores) y cada formación por puesto antes de comparar. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizarDefensas(defensas: readonly any[] | undefined): any[] {
  if (!defensas) {
    return [];
  }
  return [...defensas]
    .map((v) => ({
      ...v,
      formacion: [...v.formacion].sort((a: any, b: any) => a.puesto - b.puesto),
    }))
    .sort((a, b) =>
      `${a.caso}/${a.situacion}/${a.bloqueadores}`.localeCompare(
        `${b.caso}/${b.situacion}/${b.bloqueadores}`,
      ),
    );
}

describe('API de sistemas (spec 033)', () => {
  describe('el catálogo', () => {
    it('033-E1: un catálogo vacío devuelve una lista vacía', async () => {
      const respuesta = await fetch(`${base}/api/sistemas?equipoId=masculino`);

      expect(respuesta.status).toBe(200);
      expect(await respuesta.json()).toEqual([]);
    });

    it('033-E9: el catálogo se filtra por equipo', async () => {
      await postSistema(
        sistemaVacio(crypto.randomUUID(), 'De masculino', 'recepcion', 'masculino'),
      );
      await postSistema(sistemaVacio(crypto.randomUUID(), 'De femenino', 'recepcion', 'femenino'));

      const masculino = await getCatalogo('masculino');
      const femenino = await getCatalogo('femenino');

      expect(masculino.map((s) => s.nombre)).toEqual(['De masculino']);
      expect(femenino.map((s) => s.nombre)).toEqual(['De femenino']);
    });
  });

  describe('crear', () => {
    it('033-E2: crear un sistema lo persiste con sus seis rotaciones ya creadas', async () => {
      const id = crypto.randomUUID();
      const { status, cuerpo: creado } = await postSistema(
        sistemaVacio(id, 'Recepción 5-1', 'recepcion', 'masculino'),
      );
      expect(status).toBe(201);

      const formaciones = Object.fromEntries(
        ([1, 2, 3, 4, 5, 6] as const).map((r) => [r, formacionValida(r)]),
      );

      // Si `sistema_rotacion` no tuviera ya las seis filas, la clave ajena compuesta de
      // `formacion (sistema_id, rotacion)` habría rechazado alguna de las seis.
      const { status: statusPut } = await putSistema(
        id,
        { ...creado, formaciones },
        creado.actualizadoEn,
      );
      expect(statusPut).toBe(200);

      const [leido] = await getCatalogo('masculino');
      expect(Object.keys(leido.formaciones).sort()).toEqual(['1', '2', '3', '4', '5', '6']);
    });

    it('033-E3: un nombre repetido en el mismo equipo y tipo se rechaza', async () => {
      const { status: primero } = await postSistema(
        sistemaVacio(crypto.randomUUID(), '5-1', 'recepcion', 'masculino'),
      );
      expect(primero).toBe(201);

      const { status: segundo } = await postSistema(
        sistemaVacio(crypto.randomUUID(), '5-1', 'recepcion', 'masculino'),
      );
      expect(segundo).toBe(409);
    });

    it('033-E4: el mismo nombre en equipos distintos se acepta', async () => {
      const { status: masculino } = await postSistema(
        sistemaVacio(crypto.randomUUID(), '5-1', 'recepcion', 'masculino'),
      );
      const { status: femenino } = await postSistema(
        sistemaVacio(crypto.randomUUID(), '5-1', 'recepcion', 'femenino'),
      );

      expect(masculino).toBe(201);
      expect(femenino).toBe(201);
    });
  });

  describe('guardar una formación', () => {
    it('033-E5: una formación con el roster equivocado se rechaza, sin escribir nada', async () => {
      const id = crypto.randomUUID();
      const { cuerpo: creado } = await postSistema(
        sistemaVacio(id, 'Uno', 'recepcion', 'masculino'),
      );

      const rosterCorto = formacionValida(1).slice(0, 5); // faltan un jugador de los seis
      const { status } = await putSistema(
        id,
        { ...creado, formaciones: { 1: rosterCorto } },
        creado.actualizadoEn,
      );

      expect(status).toBe(400);
      const [leido] = await getCatalogo('masculino');
      expect(leido.formaciones[1]).toBeUndefined();
    });

    it('033-E11: las celdas de una colocación de recepción sobreviven con sus tres estados', async () => {
      const id = crypto.randomUUID();
      const { cuerpo: creado } = await postSistema(
        sistemaVacio(id, 'Recepción', 'recepcion', 'masculino'),
      );
      const [j1, j2, j3, j4, j5, j6] = jugadoresEnPista(PLANTILLA_GLOBAL, 1);

      const formacion: Formacion = [
        { jugador: j1, punto: { x: 1, y: 1 } }, // celdas ausente: nunca tocada
        { jugador: j2, punto: { x: 2, y: 2 }, celdas: [] }, // vaciada a propósito
        {
          jugador: j3,
          punto: { x: 3, y: 3 },
          celdas: [
            { columna: 0, fila: 0 },
            { columna: 17, fila: 17 },
          ],
        },
        { jugador: j4, punto: { x: 4, y: 4 } },
        { jugador: j5, punto: { x: 5, y: 5 } },
        { jugador: j6, punto: { x: 6, y: 6 } },
      ];

      const { status } = await putSistema(
        id,
        { ...creado, formaciones: { 1: formacion } },
        creado.actualizadoEn,
      );
      expect(status).toBe(200);

      const [leido] = await getCatalogo('masculino');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const guardadas: any[] = leido.formaciones['1'];
      expect(guardadas.find((c) => c.jugador.id === j1.id).celdas).toBeUndefined();
      expect(guardadas.find((c) => c.jugador.id === j2.id).celdas).toEqual([]);
      expect(guardadas.find((c) => c.jugador.id === j3.id).celdas).toEqual(
        expect.arrayContaining([
          { columna: 0, fila: 0 },
          { columna: 17, fila: 17 },
        ]),
      );
      expect(guardadas.find((c) => c.jugador.id === j3.id).celdas).toHaveLength(2);
    });

    it('038-E17 (servidor): las celdas de una colocación de defensa sobreviven con sus tres estados', async () => {
      const id = crypto.randomUUID();
      const { cuerpo: creado } = await postSistema(
        sistemaVacio(id, 'Defensa', 'defensa', 'masculino'),
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formacion: any[] = [
        { puesto: 1, punto: { x: 1, y: 1 } }, // celdas ausente: nunca tocada
        { puesto: 2, punto: { x: 2, y: 2 }, celdas: [] }, // vaciada a propósito
        {
          puesto: 3,
          punto: { x: 3, y: 3 },
          celdas: [
            { columna: 0, fila: 0 },
            { columna: 17, fila: 17 },
          ],
        },
        { puesto: 4, punto: { x: 4, y: 4 } },
        { puesto: 5, punto: { x: 5, y: 5 } },
        { puesto: 6, punto: { x: 6, y: 6 } },
      ];
      const defensas = [{ caso: 'delantero', situacion: 'z4', bloqueadores: 0, formacion }];

      const { status } = await putSistema(id, { ...creado, defensas }, creado.actualizadoEn);
      expect(status).toBe(200);

      const [leido] = await getCatalogo('masculino');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const guardadas: any[] = leido.defensas.find(
        (v: any) => v.caso === 'delantero' && v.situacion === 'z4',
      ).formacion;
      expect(guardadas.find((c) => c.puesto === 1).celdas).toBeUndefined();
      expect(guardadas.find((c) => c.puesto === 2).celdas).toEqual([]);
      expect(guardadas.find((c) => c.puesto === 3).celdas).toEqual(
        expect.arrayContaining([
          { columna: 0, fila: 0 },
          { columna: 17, fila: 17 },
        ]),
      );
      expect(guardadas.find((c) => c.puesto === 3).celdas).toHaveLength(2);
    });

    it('041-E6 (servidor): celdas y celdasFinta se guardan y se leen por separado, sin mezclarse', async () => {
      const id = crypto.randomUUID();
      const { cuerpo: creado } = await postSistema(
        sistemaVacio(id, 'Defensa', 'defensa', 'masculino'),
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formacion: any[] = [
        {
          puesto: 1,
          punto: { x: 1, y: 1 },
          celdas: [{ columna: 0, fila: 0 }],
          celdasFinta: [{ columna: 5, fila: 5 }],
        },
        { puesto: 2, punto: { x: 2, y: 2 } }, // ninguna de las dos tocada
        { puesto: 3, punto: { x: 3, y: 3 } },
        { puesto: 4, punto: { x: 4, y: 4 } },
        { puesto: 5, punto: { x: 5, y: 5 } },
        { puesto: 6, punto: { x: 6, y: 6 } },
      ];
      const defensas = [{ caso: 'delantero', situacion: 'z4', bloqueadores: 0, formacion }];

      const { status } = await putSistema(id, { ...creado, defensas }, creado.actualizadoEn);
      expect(status).toBe(200);

      const [leido] = await getCatalogo('masculino');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const guardadas: any[] = leido.defensas.find(
        (v: any) => v.caso === 'delantero' && v.situacion === 'z4',
      ).formacion;
      const puesto1 = guardadas.find((c) => c.puesto === 1);
      expect(puesto1.celdas).toEqual([{ columna: 0, fila: 0 }]);
      expect(puesto1.celdasFinta).toEqual([{ columna: 5, fila: 5 }]);
      expect(guardadas.find((c) => c.puesto === 2).celdasFinta).toBeUndefined();
    });
  });

  describe('actualizar y concurrencia', () => {
    it('033-E6: actualizar con el testigo correcto se acepta, y la marca avanza', async () => {
      const id = crypto.randomUUID();
      const { cuerpo: creado } = await postSistema(
        sistemaVacio(id, 'Uno', 'recepcion', 'masculino'),
      );

      const { status, cuerpo } = await putSistema(
        id,
        { ...creado, nombre: 'Uno renombrado' },
        creado.actualizadoEn,
      );

      expect(status).toBe(200);
      expect(cuerpo.actualizadoEn).not.toBe(creado.actualizadoEn);
      const [leido] = await getCatalogo('masculino');
      expect(leido.nombre).toBe('Uno renombrado');
    });

    it('033-E7: actualizar con un testigo caducado se rechaza, sin perder lo del otro cliente', async () => {
      const id = crypto.randomUUID();
      const { cuerpo: creado } = await postSistema(
        sistemaVacio(id, 'Uno', 'recepcion', 'masculino'),
      );
      await putSistema(
        id,
        { ...creado, nombre: 'Cambiado por otro cliente' },
        creado.actualizadoEn,
      );

      const { status } = await putSistema(
        id,
        { ...creado, nombre: 'Este cliente llega tarde' },
        creado.actualizadoEn,
      );

      expect(status).toBe(409);
      const [leido] = await getCatalogo('masculino');
      expect(leido.nombre).toBe('Cambiado por otro cliente');
    });
  });

  describe('borrar', () => {
    it('033-E8: borrar un sistema lo hace desaparecer, con todo lo suyo', async () => {
      const id = crypto.randomUUID();
      const { cuerpo: creado } = await postSistema(
        sistemaVacio(id, 'Uno', 'recepcion', 'masculino'),
      );
      await putSistema(
        id,
        { ...creado, formaciones: { 1: formacionValida(1) } },
        creado.actualizadoEn,
      );

      const { status } = await borrarSistema(id);

      expect(status).toBe(204);
      expect(await getCatalogo('masculino')).toEqual([]);
      const formacionesHuerfanas = await prisma.formacion.count({ where: { sistema_id: id } });
      expect(formacionesHuerfanas).toBe(0);
    });

    it('borrar un id que no existe devuelve 404, no 500', async () => {
      const { status } = await borrarSistema(crypto.randomUUID());

      expect(status).toBe(404);
    });
  });

  describe('semilla', () => {
    it('033-E10: la semilla reproduce exactamente lo que produce el dominio', async () => {
      await sembrarEjemplos();

      const catalogo = await getCatalogo('masculino');
      const recepcion = catalogo.find((s) => s.tipo === 'recepcion');
      const defensa = catalogo.find((s) => s.tipo === 'defensa');
      const esperadoRecepcion = sistemaPorDefecto(PLANTILLA_GLOBAL, 'masculino');
      const esperadoDefensa = sistemaDefensaPorDefecto(PLANTILLA_GLOBAL, 'masculino');

      expect(recepcion.nombre).toBe(esperadoRecepcion.nombre);
      expect(recepcion.descripcion).toBe(esperadoRecepcion.descripcion);
      expect(recepcion.explicacionesRotacion).toEqual(esperadoRecepcion.explicacionesRotacion);
      expect(normalizarFormaciones(recepcion.formaciones)).toEqual(
        normalizarFormaciones(esperadoRecepcion.formaciones),
      );

      expect(defensa.nombre).toBe(esperadoDefensa.nombre);
      expect(normalizarDefensas(defensa.defensas)).toEqual(
        normalizarDefensas(esperadoDefensa.defensas),
      );

      expect(await getCatalogo('femenino')).toEqual([]);
    });

    it('051-E7: los dos sistemas de ejemplo nacen ya validados', async () => {
      await sembrarEjemplos();

      const catalogo = await getCatalogo('masculino');

      expect(catalogo.every((s) => s.estado === 'validado')).toBe(true);
    });
  });

  describe('validar (spec 051)', () => {
    it('051-E1: un sistema recién creado nace en borrador', async () => {
      const { cuerpo: creado } = await postSistema(
        sistemaVacio(crypto.randomUUID(), 'Nuevo', 'recepcion', 'masculino'),
      );

      // POST devuelve el cuerpo enviado (sin `estado`, el cliente no lo manda al crear) más los
      // metadatos del servidor — para el estado real hay que leer el catálogo, no el eco del POST.
      expect((await getCatalogo('masculino')).find((s) => s.id === creado.id)?.estado).toBe(
        'borrador',
      );
    });

    it('051-E2: un entrenador del equipo dueño puede validar el sistema', async () => {
      const { cuerpo: creado } = await postSistema(
        sistemaVacio(crypto.randomUUID(), 'De femenino', 'recepcion', 'femenino'),
      );
      const cookie = await entrarComo('entrenadora@club.com', 'entrenador', 'femenino');

      const { status } = await ponerEstado(creado.id, 'validado', cookie);

      expect(status).toBe(200);
      expect((await getCatalogo('femenino')).find((s) => s.id === creado.id)?.estado).toBe(
        'validado',
      );
    });

    it('051-E3: el admin puede validar un sistema de cualquier equipo', async () => {
      const { cuerpo: creado } = await postSistema(
        sistemaVacio(crypto.randomUUID(), 'De masculino', 'recepcion', 'masculino'),
      );

      const { status } = await ponerEstado(creado.id, 'validado', cookieAdmin);

      expect(status).toBe(200);
    });

    it('051-E4: un entrenador de otro equipo no puede validar ese sistema', async () => {
      const { cuerpo: creado } = await postSistema(
        sistemaVacio(crypto.randomUUID(), 'De femenino', 'recepcion', 'femenino'),
      );
      const cookie = await entrarComo('entrenador-masculino@club.com', 'entrenador', 'masculino');

      const { status } = await ponerEstado(creado.id, 'validado', cookie);

      expect(status).toBe(403);
      expect((await getCatalogo('femenino')).find((s) => s.id === creado.id)?.estado).toBe(
        'borrador',
      );
    });

    it('051-E5: sin sesión, no se puede validar', async () => {
      const { cuerpo: creado } = await postSistema(
        sistemaVacio(crypto.randomUUID(), 'Sin sesión', 'recepcion', 'masculino'),
      );

      const { status } = await ponerEstado(creado.id, 'validado');

      expect(status).toBe(401);
    });

    it('051-E6: un entrenador puede quitar la validación de un sistema ya validado', async () => {
      const { cuerpo: creado } = await postSistema(
        sistemaVacio(crypto.randomUUID(), 'A corregir', 'recepcion', 'masculino'),
      );
      const cookie = await entrarComo('entrenador@club.com', 'entrenador', 'masculino');
      await ponerEstado(creado.id, 'validado', cookie);

      const { status } = await ponerEstado(creado.id, 'borrador', cookie);

      expect(status).toBe(200);
      expect((await getCatalogo('masculino')).find((s) => s.id === creado.id)?.estado).toBe(
        'borrador',
      );
    });
  });

  describe('permisos de escritura (spec 037)', () => {
    it('037-E1: un entrenador crea, edita y borra sistemas de su equipo', async () => {
      const cookie = await entrarComo('entrenadora@club.com', 'entrenador', 'masculino');
      const id = crypto.randomUUID();

      const { status: creado, cuerpo } = await postSistema(
        sistemaVacio(id, 'De masculino', 'recepcion', 'masculino'),
        cookie,
      );
      expect(creado).toBe(201);

      const { status: editado } = await putSistema(
        id,
        { ...sistemaVacio(id, 'Renombrado', 'recepcion', 'masculino') },
        cuerpo.actualizadoEn,
        cookie,
      );
      expect(editado).toBe(200);

      const { status: borrado } = await borrarSistema(id, cookie);
      expect(borrado).toBe(204);
    });

    it('037-E3: un entrenador no puede crear un sistema en un equipo donde no tiene membresía', async () => {
      const cookie = await entrarComo('entrenador-masculino@club.com', 'entrenador', 'masculino');

      const { status } = await postSistema(
        sistemaVacio(crypto.randomUUID(), 'De femenino', 'recepcion', 'femenino'),
        cookie,
      );

      expect(status).toBe(403);
    });

    it('037-E3: un entrenador no puede editar ni borrar un sistema de otro equipo', async () => {
      const { cuerpo: creado } = await postSistema(
        sistemaVacio(crypto.randomUUID(), 'De femenino', 'recepcion', 'femenino'),
      );
      const cookie = await entrarComo('entrenador-masculino@club.com', 'entrenador', 'masculino');

      const { status: editado } = await putSistema(creado.id, creado, creado.actualizadoEn, cookie);
      const { status: borrado } = await borrarSistema(creado.id, cookie);

      expect(editado).toBe(403);
      expect(borrado).toBe(403);
    });

    it('037-E4: un usuario no puede crear, editar ni borrar ningún sistema', async () => {
      const { cuerpo: creado } = await postSistema(
        sistemaVacio(crypto.randomUUID(), 'De masculino', 'recepcion', 'masculino'),
      );
      const cookie = await entrarComo('jugador@club.com', 'usuario', 'masculino');

      const { status: creacion } = await postSistema(
        sistemaVacio(crypto.randomUUID(), 'Otro', 'recepcion', 'masculino'),
        cookie,
      );
      const { status: edicion } = await putSistema(creado.id, creado, creado.actualizadoEn, cookie);
      const { status: borrado } = await borrarSistema(creado.id, cookie);

      expect(creacion).toBe(403);
      expect(edicion).toBe(403);
      expect(borrado).toBe(403);
    });

    it('037-E5: sin sesión no se puede crear, editar ni borrar', async () => {
      const { cuerpo: creado } = await postSistema(
        sistemaVacio(crypto.randomUUID(), 'De masculino', 'recepcion', 'masculino'),
      );

      const { status: creacion } = await postSistema(
        sistemaVacio(crypto.randomUUID(), 'Otro', 'recepcion', 'masculino'),
        null,
      );
      const { status: edicion } = await putSistema(creado.id, creado, creado.actualizadoEn, null);
      const { status: borrado } = await borrarSistema(creado.id, null);

      expect(creacion).toBe(401);
      expect(edicion).toBe(401);
      expect(borrado).toBe(401);
    });

    it('037-E1: sigue exigiendo If-Match aunque el permiso sea correcto', async () => {
      const cookie = await entrarComo('entrenadora2@club.com', 'entrenador', 'masculino');
      const { cuerpo: creado } = await postSistema(
        sistemaVacio(crypto.randomUUID(), 'De masculino', 'recepcion', 'masculino'),
        cookie,
      );

      const respuesta = await fetch(`${base}/api/sistemas/${creado.id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', cookie },
        body: JSON.stringify(creado),
      });

      expect(respuesta.status).toBe(400);
    });
  });
});
