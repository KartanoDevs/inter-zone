import { Router, type Request, type Response } from 'express';
import type { DatosPerfil } from '../../../src/app/domain/acceso';
import * as accesoRepositorio from '../infraestructura/acceso.repositorio';
import {
  ContrasenaDemasiadoCorta,
  CorreoYaRegistrado,
  CredencialesInvalidas,
  DorsalInvalido,
  InvitacionNoDisponible,
  PosicionFavoritaInvalida,
} from '../infraestructura/acceso.repositorio';
import { leerTestigoSesion, resolverSesion, NOMBRE_COOKIE_SESION } from './cookies';

function ponerCookieSesion(res: Response, testigo: string, expiraEn: Date): void {
  const segura = process.env['COOKIE_SEGURA'] === 'true' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${NOMBRE_COOKIE_SESION}=${testigo}; HttpOnly; Path=/; SameSite=Lax; Expires=${expiraEn.toUTCString()}${segura}`,
  );
}

function borrarCookieSesion(res: Response): void {
  res.setHeader(
    'Set-Cookie',
    `${NOMBRE_COOKIE_SESION}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`,
  );
}

export const authRutas: Router = Router();

authRutas.post('/auth/registro', async (req: Request, res: Response) => {
  const { email, contrasena } = req.body as { email?: unknown; contrasena?: unknown };
  if (typeof email !== 'string' || typeof contrasena !== 'string') {
    res.status(400).json({ error: 'email y contrasena son obligatorios' });
    return;
  }
  try {
    await accesoRepositorio.registrar(email, contrasena);
  } catch (error) {
    if (error instanceof InvitacionNoDisponible) {
      res.status(403).json({ error: 'Ese correo no tiene una invitación disponible' });
      return;
    }
    if (error instanceof CorreoYaRegistrado) {
      res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });
      return;
    }
    if (error instanceof ContrasenaDemasiadoCorta) {
      res.status(400).json({ error: 'La contraseña es demasiado corta' });
      return;
    }
    throw error;
  }
  res.status(201).json({ email });
});

authRutas.post('/auth/entrar', async (req: Request, res: Response) => {
  const { email, contrasena } = req.body as { email?: unknown; contrasena?: unknown };
  if (typeof email !== 'string' || typeof contrasena !== 'string') {
    res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    return;
  }
  try {
    const { sesion } = await accesoRepositorio.entrar(email, contrasena);
    ponerCookieSesion(res, sesion.testigo, sesion.expiraEn);
    res.status(200).json({ ok: true });
  } catch (error) {
    if (error instanceof CredencialesInvalidas) {
      res.status(401).json({ error: 'Correo o contraseña incorrectos' });
      return;
    }
    throw error;
  }
});

authRutas.post('/auth/salir', async (req: Request, res: Response) => {
  const testigo = leerTestigoSesion(req);
  if (testigo) {
    await accesoRepositorio.salir(testigo);
  }
  borrarCookieSesion(res);
  res.status(204).send();
});

authRutas.get('/auth/quien-soy', async (req: Request, res: Response) => {
  const testigo = leerTestigoSesion(req);
  if (!testigo) {
    res.status(200).json({ usuario: null });
    return;
  }
  const resultado = await accesoRepositorio.quienSoy(testigo);
  if (!resultado) {
    res.status(200).json({ usuario: null });
    return;
  }
  ponerCookieSesion(res, testigo, resultado.expiraEn);
  res.status(200).json({ usuario: resultado.usuario });
});

/** Guarda el perfil de quien pregunta, nunca el de otra cuenta (spec 053): `sesion.usuario.id`
 * viene de la propia sesión, no de nada que mande el cliente — así el correo y el rol no se
 * pueden tocar aunque el cuerpo los incluya, porque ni siquiera se leen. */
authRutas.put('/auth/perfil', async (req: Request, res: Response) => {
  const sesion = await resolverSesion(req);
  if (!sesion) {
    res.status(401).json({ error: 'Hace falta iniciar sesión' });
    return;
  }
  const { nombre, posicionFavorita, dorsal } = req.body as {
    nombre?: unknown;
    posicionFavorita?: unknown;
    dorsal?: unknown;
  };
  if (nombre !== null && typeof nombre !== 'string') {
    res.status(400).json({ error: 'nombre debe ser texto o null' });
    return;
  }
  if (posicionFavorita !== null && typeof posicionFavorita !== 'string') {
    res.status(400).json({ error: 'posicionFavorita debe ser un rol o null' });
    return;
  }
  if (dorsal !== null && typeof dorsal !== 'number') {
    res.status(400).json({ error: 'dorsal debe ser un número o null' });
    return;
  }
  const datos: DatosPerfil = { nombre, posicionFavorita, dorsal } as DatosPerfil;
  try {
    await accesoRepositorio.actualizarPerfil(sesion.usuario.id, datos);
  } catch (error) {
    if (error instanceof PosicionFavoritaInvalida) {
      res
        .status(400)
        .json({ error: 'posicionFavorita debe ser uno de los cinco roles de voleibol' });
      return;
    }
    if (error instanceof DorsalInvalido) {
      res.status(400).json({ error: 'dorsal debe estar entre 1 y 99' });
      return;
    }
    throw error;
  }
  res.status(200).json({ ok: true });
});

authRutas.put('/auth/contrasena', async (req: Request, res: Response) => {
  const sesion = await resolverSesion(req);
  if (!sesion) {
    res.status(401).json({ error: 'Hace falta iniciar sesión' });
    return;
  }
  const { actual, nueva } = req.body as { actual?: unknown; nueva?: unknown };
  if (typeof actual !== 'string' || typeof nueva !== 'string') {
    res.status(400).json({ error: 'actual y nueva son obligatorias' });
    return;
  }
  try {
    await accesoRepositorio.cambiarContrasena(sesion.usuario.id, actual, nueva);
  } catch (error) {
    if (error instanceof CredencialesInvalidas) {
      res.status(401).json({ error: 'La contraseña actual no es correcta' });
      return;
    }
    if (error instanceof ContrasenaDemasiadoCorta) {
      res.status(400).json({ error: 'La nueva contraseña es demasiado corta' });
      return;
    }
    throw error;
  }
  res.status(204).send();
});
