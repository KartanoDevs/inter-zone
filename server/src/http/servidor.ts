import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { sistemasRutas } from './sistemas.rutas';

/** Fábrica del servidor Express, sin escuchar puerto (`main.ts` lo hace, los tests de
 * integración levantan su propia instancia efímera). Sin autenticación todavía (spec 033);
 * llega con la spec 035. */
export function crearServidor(): Express {
  const app = express();
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
