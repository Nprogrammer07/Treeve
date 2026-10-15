import type { Ecosistema } from '../../domain/entities/Ecosistema';
import type { EcosistemaRepository } from '../../domain/repositories/EcosistemaRepository';

export class ActualizarEcosistema {
  constructor(private readonly ecosistemas: EcosistemaRepository) {}

  execute(usuarioId: string): Promise<Ecosistema> {
    return this.ecosistemas.recalcular(usuarioId);
  }
}
