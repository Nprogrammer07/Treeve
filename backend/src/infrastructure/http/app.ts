import cors from 'cors';
import express, { type Express, type Router } from 'express';
import helmet from 'helmet';
import { manejarErrores } from '../../adapters/http/middlewares/manejarErrores';

export function createApp(rutas: Router, corsOrigins: string[]): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // detrás del proxy TLS de la plataforma (X-Forwarded-*)

  app.use(helmet()); // incluye HSTS: el navegador forzará HTTPS
  app.use(cors({ origin: corsOrigins.length > 0 ? corsOrigins : false }));
  app.use(express.json({ limit: '50kb' }));

  app.use(rutas);

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' } });
  });
  app.use(manejarErrores);
  return app;
}
