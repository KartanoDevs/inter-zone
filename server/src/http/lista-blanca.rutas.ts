import { Router, type Request, type Response } from 'express';
import type { EquipoId } from '../../../src/app/domain/modelos';
import * as accesoRepositorio from '../infraestructura/acceso.repositorio';
import { CorreoYaRegistrado, RolAccesoInvalido } from '../infraestructura/acceso.repositorio';
import { resolverSesion } from './cookies';

const EQUIPOS_VALIDOS: readonly EquipoId[] = ['masculino', 'femenino'];

function esEquipoValido(valor: unknown): valor is EquipoId {
  return typeof valor === 'string' && (EQUIPOS_VALIDOS as readonly string[]).includes(valor);
}

/** Gestionar la lista blanca es solo para el admin (spec 054) — nunca un entrenador, aunque
 * lleve membresía de entrenador en todos los equipos. */
async function exigirAdmin(req: Request, res: Response): ReturnType<typeof resolverSesion> {
  const sesion = await resolverSesion(req);
  if (!sesion) {
    res.status(401).json({ error: 'Hace falta iniciar sesión' });
    return null;
  }
  if (!sesion.usuario.esAdmin) {
    res.status(403).json({ error: 'Solo el admin gestiona la lista blanca' });
    return null;
  }
  return sesion;
}

export const listaBlancaRutas: Router = Router();

listaBlancaRutas.get('/lista-blanca', async (req: Request, res: Response) => {
  if (!(await exigirAdmin(req, res))) {
    return;
  }
  res.status(200).json(await accesoRepositorio.listarInvitaciones());
});

listaBlancaRutas.post('/lista-blanca', async (req: Request, res: Response) => {
  const sesion = await exigirAdmin(req, res);
  if (!sesion) {
    return;
  }
  const { email, rol, equipoId } = req.body as {
    email?: unknown;
    rol?: unknown;
    equipoId?: unknown;
  };
  if (typeof email !== 'string') {
    res.status(400).json({ error: 'email es obligatorio' });
    return;
  }
  if (equipoId !== null && !esEquipoValido(equipoId)) {
    res.status(400).json({ error: 'equipoId debe ser "masculino", "femenino" o null' });
    return;
  }
  try {
    await accesoRepositorio.invitar(
      email,
      rol as string,
      equipoId as EquipoId | null,
      sesion.usuario.id,
    );
  } catch (error) {
    if (error instanceof RolAccesoInvalido) {
      res.status(400).json({ error: 'rol debe ser "admin", "entrenador" o "usuario"' });
      return;
    }
    if (error instanceof CorreoYaRegistrado) {
      res.status(409).json({
        error: 'Ese correo ya tiene cuenta; su rol se cambia desde la cuenta, no desde aquí',
      });
      return;
    }
    throw error;
  }
  res.status(201).json({ ok: true });
});

listaBlancaRutas.delete('/lista-blanca/:email', async (req: Request, res: Response) => {
  if (!(await exigirAdmin(req, res))) {
    return;
  }
  await accesoRepositorio.retirarInvitacion(req.params['email'] as string);
  res.status(204).send();
});
