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

beforeEach(async () => {
  // Cascada de FK: borra sistema_rotacion, formacion y colocacion también. equipo y jugador,
  // el catálogo base, se quedan.
  await prisma.sistema.deleteMany({});
});

function sistemaVacio(id: string, nombre: string, tipo: TipoSistema, equipoId: EquipoId): Sistema {
  return { id, nombre, tipo, equipoId, plantilla: PLANTILLA_GLOBAL, formaciones: {}, explicacionesRotacion: {} };
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

async function postSistema(sistema: Sistema): Promise<RespuestaJson> {
  const respuesta = await fetch(`${base}/api/sistemas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(sistema),
  });
  return { status: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

async function putSistema(id: string, sistema: object, testigoIfMatch: string): Promise<RespuestaJson> {
  const respuesta = await fetch(`${base}/api/sistemas/${id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'If-Match': testigoIfMatch },
    body: JSON.stringify(sistema),
  });
  return { status: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getCatalogo(equipoId: EquipoId): Promise<any[]> {
  const respuesta = await fetch(`${base}/api/sistemas?equipoId=${equipoId}`);
  return (await respuesta.json()) as any[];
}

async function borrarSistema(id: string): Promise<RespuestaJson> {
  const respuesta = await fetch(`${base}/api/sistemas/${id}`, { method: 'DELETE' });
  return { status: respuesta.status, cuerpo: null };
}

/** Una `Formacion` es un conjunto de seis colocaciones, no una secuencia — el orden en que
 * Postgres las devuelve no tiene por qué coincidir con el del dominio. Se ordena por id de
 * jugador antes de comparar. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizarFormaciones(formaciones: Readonly<Record<string, readonly any[]>>): Record<string, any[]> {
  const resultado: Record<string, unknown[]> = {};
  for (const [clave, formacion] of Object.entries(formaciones)) {
    resultado[clave] = [...formacion].sort((a, b) => a.jugador.id.localeCompare(b.jugador.id));
  }
  return resultado;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizarDefensas(
  defensas: Readonly<Record<string, Readonly<Record<string, readonly any[]>>>> | undefined,
): Record<string, Record<string, unknown[]>> {
  if (!defensas) {
    return {};
  }
  const resultado: Record<string, Record<string, unknown[]>> = {};
  for (const [rotacion, porVia] of Object.entries(defensas)) {
    resultado[rotacion] = normalizarFormaciones(porVia);
  }
  return resultado;
}

describe('API de sistemas (spec 033)', () => {
  describe('el catálogo', () => {
    it('033-E1: un catálogo vacío devuelve una lista vacía', async () => {
      const respuesta = await fetch(`${base}/api/sistemas?equipoId=masculino`);

      expect(respuesta.status).toBe(200);
      expect(await respuesta.json()).toEqual([]);
    });

    it('033-E9: el catálogo se filtra por equipo', async () => {
      await postSistema(sistemaVacio(crypto.randomUUID(), 'De masculino', 'recepcion', 'masculino'));
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
      const { status, cuerpo: creado } = await postSistema(sistemaVacio(id, 'Recepción 5-1', 'recepcion', 'masculino'));
      expect(status).toBe(201);

      const formaciones = Object.fromEntries(
        ([1, 2, 3, 4, 5, 6] as const).map((r) => [r, formacionValida(r)]),
      );

      // Si `sistema_rotacion` no tuviera ya las seis filas, la clave ajena compuesta de
      // `formacion (sistema_id, rotacion)` habría rechazado alguna de las seis.
      const { status: statusPut } = await putSistema(id, { ...creado, formaciones }, creado.actualizadoEn);
      expect(statusPut).toBe(200);

      const [leido] = await getCatalogo('masculino');
      expect(Object.keys(leido.formaciones).sort()).toEqual(['1', '2', '3', '4', '5', '6']);
    });

    it('033-E3: un nombre repetido en el mismo equipo y tipo se rechaza', async () => {
      const { status: primero } = await postSistema(sistemaVacio(crypto.randomUUID(), '5-1', 'recepcion', 'masculino'));
      expect(primero).toBe(201);

      const { status: segundo } = await postSistema(sistemaVacio(crypto.randomUUID(), '5-1', 'recepcion', 'masculino'));
      expect(segundo).toBe(409);
    });

    it('033-E4: el mismo nombre en equipos distintos se acepta', async () => {
      const { status: masculino } = await postSistema(sistemaVacio(crypto.randomUUID(), '5-1', 'recepcion', 'masculino'));
      const { status: femenino } = await postSistema(sistemaVacio(crypto.randomUUID(), '5-1', 'recepcion', 'femenino'));

      expect(masculino).toBe(201);
      expect(femenino).toBe(201);
    });
  });

  describe('guardar una formación', () => {
    it('033-E5: una formación con el roster equivocado se rechaza, sin escribir nada', async () => {
      const id = crypto.randomUUID();
      const { cuerpo: creado } = await postSistema(sistemaVacio(id, 'Uno', 'recepcion', 'masculino'));

      const rosterCorto = formacionValida(1).slice(0, 5); // faltan un jugador de los seis
      const { status } = await putSistema(id, { ...creado, formaciones: { 1: rosterCorto } }, creado.actualizadoEn);

      expect(status).toBe(400);
      const [leido] = await getCatalogo('masculino');
      expect(leido.formaciones[1]).toBeUndefined();
    });

    it('033-E11: las celdas de una colocación sobreviven con sus tres estados', async () => {
      const id = crypto.randomUUID();
      const { cuerpo: creado } = await postSistema(sistemaVacio(id, 'Defensa', 'defensa', 'masculino'));
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

      const { status } = await putSistema(id, { ...creado, defensas: { 1: { z4: formacion } } }, creado.actualizadoEn);
      expect(status).toBe(200);

      const [leido] = await getCatalogo('masculino');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const guardadas: any[] = leido.defensas['1'].z4;
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
  });

  describe('actualizar y concurrencia', () => {
    it('033-E6: actualizar con el testigo correcto se acepta, y la marca avanza', async () => {
      const id = crypto.randomUUID();
      const { cuerpo: creado } = await postSistema(sistemaVacio(id, 'Uno', 'recepcion', 'masculino'));

      const { status, cuerpo } = await putSistema(id, { ...creado, nombre: 'Uno renombrado' }, creado.actualizadoEn);

      expect(status).toBe(200);
      expect(cuerpo.actualizadoEn).not.toBe(creado.actualizadoEn);
      const [leido] = await getCatalogo('masculino');
      expect(leido.nombre).toBe('Uno renombrado');
    });

    it('033-E7: actualizar con un testigo caducado se rechaza, sin perder lo del otro cliente', async () => {
      const id = crypto.randomUUID();
      const { cuerpo: creado } = await postSistema(sistemaVacio(id, 'Uno', 'recepcion', 'masculino'));
      await putSistema(id, { ...creado, nombre: 'Cambiado por otro cliente' }, creado.actualizadoEn);

      const { status } = await putSistema(id, { ...creado, nombre: 'Este cliente llega tarde' }, creado.actualizadoEn);

      expect(status).toBe(409);
      const [leido] = await getCatalogo('masculino');
      expect(leido.nombre).toBe('Cambiado por otro cliente');
    });
  });

  describe('borrar', () => {
    it('033-E8: borrar un sistema lo hace desaparecer, con todo lo suyo', async () => {
      const id = crypto.randomUUID();
      const { cuerpo: creado } = await postSistema(sistemaVacio(id, 'Uno', 'recepcion', 'masculino'));
      await putSistema(id, { ...creado, formaciones: { 1: formacionValida(1) } }, creado.actualizadoEn);

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
      expect(normalizarFormaciones(recepcion.formaciones)).toEqual(normalizarFormaciones(esperadoRecepcion.formaciones));

      expect(defensa.nombre).toBe(esperadoDefensa.nombre);
      expect(normalizarDefensas(defensa.defensas)).toEqual(normalizarDefensas(esperadoDefensa.defensas));

      expect(await getCatalogo('femenino')).toEqual([]);
    });
  });
});
