import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { sistemasRutas } from './sistemas.rutas';

/** CORS mínimo (spec 034): un origen permitido y configurable, sin la dependencia `cors` —
 * no hace falta más que estas cabeceras para que el navegador deje llamar a la API desde el
 * puerto de desarrollo de Angular (4200), distinto del suyo. No es un sistema de configuración
 * de entornos: es la línea imprescindible para que la pizarra pueda hablar con el servidor. */
function cors(req: Request, res: Response, next: NextFunction): void {
  const origen = process.env['ORIGEN_PERMITIDO'] ?? 'http://localhost:4200';
  res.setHeader('Access-Control-Allow-Origin', origen);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,If-Match');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
}

/** Fábrica del servidor Express, sin escuchar puerto (`main.ts` lo hace, los tests de
 * integración levantan su propia instancia efímera). Sin autenticación todavía (spec 033);
 * llega con la spec 035. */
export function crearServidor(): Express {
  const app = express();
  app.use(cors);
  app.use(express.json());
  app.use('/api', sistemasRutas);

  // Express 5 reenvía los rechazos de las rutas async aquí solo; no hace falta try/catch en
  // cada una.
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}
