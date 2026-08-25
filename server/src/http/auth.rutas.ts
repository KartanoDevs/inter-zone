import { Router, type Request, type Response } from 'express';
import * as accesoRepositorio from '../infraestructura/acceso.repositorio';
import {
  ContrasenaDemasiadoCorta,
  CorreoYaRegistrado,
  CredencialesInvalidas,
  InvitacionNoDisponible,
} from '../infraestructura/acceso.repositorio';
import { leerTestigoSesion, NOMBRE_COOKIE_SESION } from './cookies';

function ponerCookieSesion(res: Response, testigo: string, expiraEn: Date): void {
  const segura = process.env['COOKIE_SEGURA'] === 'true' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${NOMBRE_COOKIE_SESION}=${testigo}; HttpOnly; Path=/; SameSite=Lax; Expires=${expiraEn.toUTCString()}${segura}`,
  );
}

function borrarCookieSesion(res: Response): void {
  res.setHeader('Set-Cookie', `${NOMBRE_COOKIE_SESION}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
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
