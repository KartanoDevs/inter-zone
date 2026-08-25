import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { authRutas } from './auth.rutas';
import { listaBlancaRutas } from './lista-blanca.rutas';
import { sistemasRutas } from './sistemas.rutas';

/** CORS mínimo (spec 034, cookies desde la spec 035): un origen permitido y configurable, sin
 * la dependencia `cors` — no hace falta más que estas cabeceras para que el navegador deje
 * llamar a la API desde el puerto de desarrollo de Angular (4200), distinto del suyo, y mande
 * la cookie de sesión. `Access-Control-Allow-Credentials` exige un origen concreto, nunca `*`
 * — ya lo era, `ORIGEN_PERMITIDO` nunca ha sido un comodín. */
function cors(req: Request, res: Response, next: NextFunction): void {
  const origen = process.env['ORIGEN_PERMITIDO'] ?? 'http://localhost:4200';
  res.setHeader('Access-Control-Allow-Origin', origen);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,If-Match');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
}

/** Fábrica del servidor Express, sin escuchar puerto (`main.ts` lo hace, los tests de
 * integración levantan su propia instancia efímera). `/api/auth` (spec 035) da cuenta,
 * contraseña y sesión; `/api/lista-blanca` (spec 054) es solo para el admin;
 * `/api/sistemas` exige sesión y rol al escribir desde la spec 037, no al leer. */
export function crearServidor(): Express {
  const app = express();
  app.use(cors);
  app.use(express.json());
  app.use('/api', authRutas);
  app.use('/api', listaBlancaRutas);
  app.use('/api', sistemasRutas);

  // Express 5 reenvía los rechazos de las rutas async aquí solo; no hace falta try/catch en
  // cada una.
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}
