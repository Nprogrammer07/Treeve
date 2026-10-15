import type { ActualizarEcosistema } from './use-cases/ActualizarEcosistema';
import type { RegistrarDesahogo } from './use-cases/RegistrarDesahogo';

export interface Credenciales {
  readonly userId: string;
  readonly accessToken: string; // JWT del usuario: hace que RLS se aplique en cada consulta
}

export interface CasosDeUsoUsuario {
  registrarDesahogo: RegistrarDesahogo;
  actualizarEcosistema: ActualizarEcosistema;
}

/** Fábrica por petición: construye los casos de uso con un cliente Supabase ligado al usuario. */
export type CasosDeUsoFactory = (credenciales: Credenciales) => CasosDeUsoUsuario;
