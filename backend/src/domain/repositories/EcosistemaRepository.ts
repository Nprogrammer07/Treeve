import type { Ecosistema } from '../entities/Ecosistema';

export interface EcosistemaRepository {
  /** Recalcula el ecosistema a partir de los desahogos del usuario (idempotente). */
  recalcular(usuarioId: string): Promise<Ecosistema>;
}
