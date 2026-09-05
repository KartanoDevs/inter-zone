import { Router, type Request, type Response } from 'express';
import * as accesoRepositorio from '../infraestructura/acceso.repositorio';
import { UltimoAdminNoSePuedeBorrar } from '../infraestructura/acceso.repositorio';
import { resolverSesion } from './cookies';

/** Gestionar las cuentas es solo para el admin (spec 068), mismo criterio que la lista blanca
 * (054): nunca un entrenador, aunque lleve membresía de entrenador en todos los equipos. */
async function exigirAdmin(req: Request, res: Response): ReturnType<typeof resolverSesion> {
  const sesion = await resolverSesion(req);
  if (!sesion) {
    res.status(401).json({ error: 'Hace falta iniciar sesión' });
    return null;
  }
  if (!sesion.usuario.esAdmin) {
    res.status(403).json({ error: 'Solo el admin gestiona las cuentas' });
    return null;
  }
  return sesion;
}

export const usuariosRutas: Router = Router();

usuariosRutas.get('/usuarios', async (req: Request, res: Response) => {
  if (!(await exigirAdmin(req, res))) {
    return;
  }
  res.status(200).json(await accesoRepositorio.listarUsuarios());
});

usuariosRutas.delete('/usuarios/:id', async (req: Request, res: Response) => {
  if (!(await exigirAdmin(req, res))) {
    return;
  }
  try {
    await accesoRepositorio.borrarUsuario(req.params['id'] as string);
  } catch (error) {
    if (error instanceof UltimoAdminNoSePuedeBorrar) {
      res.status(409).json({ error: 'No se puede borrar al último admin' });
      return;
    }
    throw error;
  }
  res.status(204).send();
});
