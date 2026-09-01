import { Router, type Request, type Response } from 'express';
import type { EquipoId, EstadoSistema, Sistema } from '../../../src/app/domain/modelos';
import { puedeGestionarEquipo, tieneAccesoAEquipo } from '../../../src/app/domain/acceso';
import * as sistemaRepositorio from '../infraestructura/sistema.repositorio';
import {
  ConflictoDeConcurrencia,
  RosterInvalido,
  SistemaNoEncontrado,
} from '../infraestructura/sistema.repositorio';
import { resolverSesion } from './cookies';

const EQUIPOS_VALIDOS: readonly EquipoId[] = ['masculino', 'femenino'];

function esEquipoValido(valor: unknown): valor is EquipoId {
  return typeof valor === 'string' && (EQUIPOS_VALIDOS as readonly string[]).includes(valor);
}

/** Crear, editar, clonar y borrar sistemas exige sesión y rol (spec 037): el admin, o un
 * entrenador con membresía en `equipoId`. Devuelve la sesión si el permiso es real, o `null`
 * tras haber escrito ya la respuesta de rechazo — el llamador solo tiene que cortar si es `null`. */
async function exigirPermisoDeEquipo(
  req: Request,
  res: Response,
  equipoId: EquipoId,
): Promise<Awaited<ReturnType<typeof resolverSesion>>> {
  const sesion = await resolverSesion(req);
  if (!sesion) {
    res.status(401).json({ error: 'Hace falta iniciar sesión' });
    return null;
  }
  if (!puedeGestionarEquipo(sesion.usuario, equipoId)) {
    res.status(403).json({ error: 'No tienes permiso para editar sistemas de este equipo' });
    return null;
  }
  return sesion;
}

/** `POST /api/sistemas` y `PUT /api/sistemas/:id` reciben el `Sistema` de dominio tal cual lo
 * serializa el cliente — mismo formato que ya viajaba a `localStorage`, solo que ahora por
 * red. Ninguna traducción de forma en la frontera HTTP. */
export const sistemasRutas: Router = Router();

sistemasRutas.get('/sistemas', async (req: Request, res: Response) => {
  const equipoId = req.query['equipoId'];
  if (!esEquipoValido(equipoId)) {
    res.status(400).json({ error: 'equipoId debe ser "masculino" o "femenino"' });
    return;
  }
  // Leer el catálogo exige sesión y membresía en el equipo (spec 064): el admin siempre, un
  // entrenador o usuario solo el suyo. Un usuario del femenino no debe poder ver el masculino
  // ni con curl.
  const sesion = await resolverSesion(req);
  if (!sesion) {
    res.status(401).json({ error: 'Hace falta iniciar sesión' });
    return;
  }
  if (!tieneAccesoAEquipo(sesion.usuario, equipoId)) {
    res.status(403).json({ error: 'No tienes acceso a los sistemas de este equipo' });
    return;
  }
  const sistemas = await sistemaRepositorio.listar(equipoId);
  res.json(sistemas);
});

sistemasRutas.post('/sistemas', async (req: Request, res: Response) => {
  const sistema = req.body as Sistema;
  if (!esEquipoValido(sistema?.equipoId)) {
    res.status(400).json({ error: 'equipoId debe ser "masculino" o "femenino"' });
    return;
  }
  if (!(await exigirPermisoDeEquipo(req, res, sistema.equipoId))) {
    return;
  }
  let actualizadoEn: string;
  try {
    actualizadoEn = await sistemaRepositorio.crear(sistema);
  } catch (error) {
    if (error instanceof RosterInvalido) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (esViolacionDeUnicidad(error)) {
      res.status(409).json({ error: 'Ya existe un sistema con ese nombre en ese equipo y tipo' });
      return;
    }
    throw error;
  }
  res.status(201).json({ ...sistema, actualizadoEn });
});

sistemasRutas.put('/sistemas/:id', async (req: Request, res: Response) => {
  const testigo = req.get('If-Match');
  if (!testigo) {
    res
      .status(400)
      .json({ error: 'Falta la cabecera If-Match con la marca de última modificación' });
    return;
  }
  const id = req.params['id'] as string;
  // El equipo real es el ya guardado, nunca el que traiga el cuerpo (spec 037): un entrenador
  // no puede colarse en otro equipo mintiendo sobre equipoId — no cambia una vez creado (spec
  // 032) y `actualizar()` ni siquiera lo usa para nada más.
  const equipoReal = await sistemaRepositorio.equipoDelSistema(id);
  if (!equipoReal) {
    res.status(404).json({ error: 'Sistema no encontrado' });
    return;
  }
  if (!(await exigirPermisoDeEquipo(req, res, equipoReal))) {
    return;
  }
  const sistema = { ...(req.body as Sistema), id };
  try {
    const actualizadoEn = await sistemaRepositorio.actualizar(sistema, testigo);
    res.json({ actualizadoEn });
  } catch (error) {
    if (error instanceof SistemaNoEncontrado) {
      res.status(404).json({ error: 'Sistema no encontrado' });
      return;
    }
    if (error instanceof ConflictoDeConcurrencia) {
      res.status(409).json({ error: 'Alguien más modificó este sistema mientras tanto' });
      return;
    }
    if (error instanceof RosterInvalido) {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }
});

/** Validar o quitar la validación (spec 051): exige sesión y rol, igual que crear/editar/borrar
 * desde la spec 037 — ya no es la única excepción de este fichero. */
sistemasRutas.put('/sistemas/:id/estado', async (req: Request, res: Response) => {
  const { estado } = req.body as { estado?: unknown };
  if (estado !== 'validado' && estado !== 'borrador') {
    res.status(400).json({ error: 'estado debe ser "validado" o "borrador"' });
    return;
  }
  const id = req.params['id'] as string;
  const equipoId = await sistemaRepositorio.equipoDelSistema(id);
  if (!equipoId) {
    res.status(404).json({ error: 'Sistema no encontrado' });
    return;
  }
  const sesion = await exigirPermisoDeEquipo(req, res, equipoId);
  if (!sesion) {
    return;
  }
  await sistemaRepositorio.cambiarEstadoSistema(
    id,
    estado as EstadoSistema,
    estado === 'validado' ? sesion.usuario.id : null,
  );
  res.status(200).json({ estado });
});

sistemasRutas.delete('/sistemas/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const equipoId = await sistemaRepositorio.equipoDelSistema(id);
  if (!equipoId) {
    res.status(404).json({ error: 'Sistema no encontrado' });
    return;
  }
  if (!(await exigirPermisoDeEquipo(req, res, equipoId))) {
    return;
  }
  try {
    await sistemaRepositorio.borrar(id);
  } catch (error) {
    if (error instanceof SistemaNoEncontrado) {
      res.status(404).json({ error: 'Sistema no encontrado' });
      return;
    }
    throw error;
  }
  res.status(204).send();
});

function esViolacionDeUnicidad(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'P2002'
  );
}
