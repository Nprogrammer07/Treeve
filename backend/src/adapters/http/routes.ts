import { RequestHandler, Router } from 'express';
import type { DesahogoController } from './controllers/DesahogoController';
import type { EcosistemaController } from './controllers/EcosistemaController';
import type { SaludController } from './controllers/SaludController';

export interface RutasDeps {
  salud: SaludController;
  desahogos: DesahogoController;
  ecosistema: EcosistemaController;
  autenticar: RequestHandler;
}

export function crearRutas(d: RutasDeps): Router {
  const router = Router();

  router.get('/health', d.salud.verificar); // público

  const api = Router();
  api.use(d.autenticar); // todo lo de /api/v1 requiere JWT de Supabase Auth
  api.post('/desahogos', d.desahogos.registrar);
  api.post('/ecosistema/actualizar', d.ecosistema.actualizar);
  router.use('/api/v1', api);

  return router;
}
