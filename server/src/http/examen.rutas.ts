import { Router, type Request, type Response } from 'express';
import type { TipoExamen } from '../../../src/app/domain/examen';
import { insigniasDe, registrarInsignia } from '../infraestructura/insignias.repositorio';
import { resolverSesion } from './cookies';

const TIPOS_VALIDOS: readonly TipoExamen[] = ['puesto', 'linea', 'sistema'];

function esTipoExamenValido(valor: unknown): valor is TipoExamen {
  return typeof valor === 'string' && (TIPOS_VALIDOS as readonly string[]).includes(valor);
}

export const examenRutas: Router = Router();

/** Insignias de la propia cuenta (spec 056, E4-E6): nunca las de otra — no se acepta ningún id
 * de usuario en la petición, solo el de la sesión. */
examenRutas.get('/examen/insignias', async (req: Request, res: Response) => {
  const sesion = await resolverSesion(req);
  if (!sesion) {
    res.status(401).json({ error: 'Hace falta iniciar sesión' });
    return;
  }
  res.status(200).json(await insigniasDe(sesion.usuario.id));
});

/** Registrar que se ha ganado una insignia (spec 056, E1-E3, E7): exige sesión; `titularId` solo
 * tiene sentido si el tipo no es 'sistema' (spec 012). */
examenRutas.post('/examen/insignias', async (req: Request, res: Response) => {
  const sesion = await resolverSesion(req);
  if (!sesion) {
    res.status(401).json({ error: 'Hace falta iniciar sesión' });
    return;
  }
  const { sistemaId, tipo, titularId } = req.body as {
    sistemaId?: unknown;
    tipo?: unknown;
    titularId?: unknown;
  };
  if (typeof sistemaId !== 'string') {
    res.status(400).json({ error: 'sistemaId es obligatorio' });
    return;
  }
  if (!esTipoExamenValido(tipo)) {
    res.status(400).json({ error: 'tipo debe ser "puesto", "linea" o "sistema"' });
    return;
  }
  if (titularId !== null && titularId !== undefined && typeof titularId !== 'string') {
    res.status(400).json({ error: 'titularId debe ser una cadena o null' });
    return;
  }
  await registrarInsignia(sesion.usuario.id, sistemaId, tipo, (titularId as string | null) ?? null);
  res.status(201).json({ ok: true });
});
