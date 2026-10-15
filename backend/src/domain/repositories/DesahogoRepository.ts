import type { DesahogoGuardado } from '../entities/Desahogo';

export interface DesahogoCifrado {
  readonly usuarioId: string;
  readonly emocionId: number;
  readonly intensidad: number;
  readonly contenidoCifrado: string;
}

export interface DesahogoRepository {
  guardar(desahogo: DesahogoCifrado): Promise<DesahogoGuardado>;
}
