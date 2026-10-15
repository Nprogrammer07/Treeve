import type { SaludRepository } from '../../domain/repositories/SaludRepository';

export interface EstadoSalud {
  status: 'ok' | 'degraded';
  db: 'up' | 'down';
  latencyMs: number | null;
  timestamp: string;
  version: string;
}

export class ChequearSalud {
  constructor(private readonly salud: SaludRepository, private readonly version: string) {}

  async execute(): Promise<EstadoSalud> {
    const inicio = Date.now();
    try {
      await this.salud.verificarConexion();
      return {
        status: 'ok', db: 'up',
        latencyMs: Date.now() - inicio,
        timestamp: new Date().toISOString(), version: this.version,
      };
    } catch {
      return {
        status: 'degraded', db: 'down', latencyMs: null,
        timestamp: new Date().toISOString(), version: this.version,
      };
    }
  }
}
