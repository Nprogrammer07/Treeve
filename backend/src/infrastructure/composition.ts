import type { Express } from 'express';
import { DesahogoController } from '../adapters/http/controllers/DesahogoController';
import { EcosistemaController } from '../adapters/http/controllers/EcosistemaController';
import { SaludController } from '../adapters/http/controllers/SaludController';
import { authenticate } from '../adapters/http/middlewares/authenticate';
import { crearRutas } from '../adapters/http/routes';
import { SupabaseDesahogoRepository } from '../adapters/repositories/SupabaseDesahogoRepository';
import { SupabaseEcosistemaRepository } from '../adapters/repositories/SupabaseEcosistemaRepository';
import { SupabaseSaludRepository } from '../adapters/repositories/SupabaseSaludRepository';
import type { CasosDeUsoFactory } from '../application/CasosDeUsoUsuario';
import { ActualizarEcosistema } from '../application/use-cases/ActualizarEcosistema';
import { ChequearSalud } from '../application/use-cases/ChequearSalud';
import { RegistrarDesahogo } from '../application/use-cases/RegistrarDesahogo';
import type { Env } from './config/env';
import { AesGcmServicioCifrado } from './crypto/AesGcmServicioCifrado';
import { createApp } from './http/app';
import { createAnonClient, createUserClient, SupabaseTokenVerifier } from './supabase/clients';

/** Composition root: único lugar que conoce las implementaciones concretas. */
export function buildApp(env: Env): Express {
  const anon = createAnonClient(env);
  const cifrado = new AesGcmServicioCifrado(env.ENCRYPTION_KEY);

  const casosDeUso: CasosDeUsoFactory = ({ accessToken }) => {
    const db = createUserClient(env, accessToken);
    const actualizarEcosistema = new ActualizarEcosistema(new SupabaseEcosistemaRepository(db));
    return {
      actualizarEcosistema,
      registrarDesahogo: new RegistrarDesahogo(new SupabaseDesahogoRepository(db), cifrado, actualizarEcosistema),
    };
  };

  const rutas = crearRutas({
    salud: new SaludController(new ChequearSalud(new SupabaseSaludRepository(anon), process.env.npm_package_version ?? '0.1.0')),
    desahogos: new DesahogoController(casosDeUso),
    ecosistema: new EcosistemaController(casosDeUso),
    autenticar: authenticate(new SupabaseTokenVerifier(anon)),
  });

  return createApp(rutas, env.CORS_ORIGINS);
}
