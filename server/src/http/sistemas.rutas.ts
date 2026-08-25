import { Router, type Request, type Response } from 'express';
import type { EquipoId, EstadoSistema, Sistema } from '../../../src/app/domain/modelos';
import { puedeValidar } from '../../../src/app/domain/acceso';
import * as sistemaRepositorio from '../infraestructura/sistema.repositorio';
import { ConflictoDeConcurrencia, RosterInvalido, SistemaNoEncontrado } from '../infraestructura/sistema.repositorio';
import * as accesoRepositorio from '../infraestructura/acceso.repositorio';
import { leerTestigoSesion } from './cookies';

const EQUIPOS_VALIDOS: readonly EquipoId[] = ['masculino', 'femenino'];

function esEquipoValido(valor: unknown): valor is EquipoId {
  return typeof valor === 'string' && (EQUIPOS_VALIDOS as readonly string[]).includes(valor);
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
  const sistemas = await sistemaRepositorio.listar(equipoId);
  res.json(sistemas);
});

sistemasRutas.post('/sistemas', async (req: Request, res: Response) => {
  const sistema = req.body as Sistema;
  if (!esEquipoValido(sistema?.equipoId)) {
    res.status(400).json({ error: 'equipoId debe ser "masculino" o "femenino"' });
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
    res.status(400).json({ error: 'Falta la cabecera If-Match con la marca de última modificación' });
    return;
  }
  const sistema = { ...(req.body as Sistema), id: req.params['id'] as string };
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

/** Validar o quitar la validación (spec 051) es la única acción de `/api/sistemas` que ya exige
 * sesión y rol: el admin, o un entrenador del equipo dueño del sistema — el resto de rutas de
 * este fichero se queda abierto hasta la spec 037. */
sistemasRutas.put('/sistemas/:id/estado', async (req: Request, res: Response) => {
  const { estado } = req.body as { estado?: unknown };
  if (estado !== 'validado' && estado !== 'borrador') {
    res.status(400).json({ error: 'estado debe ser "validado" o "borrador"' });
    return;
  }
  const testigo = leerTestigoSesion(req);
  const sesion = testigo ? await accesoRepositorio.quienSoy(testigo) : null;
  if (!sesion) {
    res.status(401).json({ error: 'Hace falta iniciar sesión' });
    return;
  }
  const id = req.params['id'] as string;
  const equipoId = await sistemaRepositorio.equipoDelSistema(id);
  if (!equipoId) {
    res.status(404).json({ error: 'Sistema no encontrado' });
    return;
  }
  if (!puedeValidar(sesion.usuario, equipoId)) {
    res.status(403).json({ error: 'No tienes permiso para validar sistemas de este equipo' });
    return;
  }
  await sistemaRepositorio.cambiarEstadoSistema(id, estado as EstadoSistema, estado === 'validado' ? sesion.usuario.id : null);
  res.status(200).json({ estado });
});

sistemasRutas.delete('/sistemas/:id', async (req: Request, res: Response) => {
  try {
    await sistemaRepositorio.borrar(req.params['id'] as string);
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
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === 'P2002';
}
