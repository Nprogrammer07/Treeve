import { crearNuevoDesahogo } from '../../domain/entities/Desahogo';
import type { Ecosistema } from '../../domain/entities/Ecosistema';
import type { DesahogoRepository } from '../../domain/repositories/DesahogoRepository';
import type { ServicioCifrado } from '../../domain/services/ServicioCifrado';
import type { ActualizarEcosistema } from './ActualizarEcosistema';

export interface RegistrarDesahogoInput {
  usuarioId: string;
  emocionId: number;
  intensidad: number;
  contenido: string;
}

export interface RegistrarDesahogoOutput {
  desahogoId: string;
  creadoEn: string;
  ecosistema: Ecosistema;
}

export class RegistrarDesahogo {
  constructor(
    private readonly desahogos: DesahogoRepository,
    private readonly cifrado: ServicioCifrado,
    private readonly actualizarEcosistema: ActualizarEcosistema,
  ) {}

  async execute(input: RegistrarDesahogoInput): Promise<RegistrarDesahogoOutput> {
    const nuevo = crearNuevoDesahogo(input);

    // El texto plano nunca sale de este caso de uso hacia la base de datos.
    const contenidoCifrado = this.cifrado.cifrar(nuevo.contenido);

    const guardado = await this.desahogos.guardar({
      usuarioId: nuevo.usuarioId,
      emocionId: nuevo.emocionId,
      intensidad: nuevo.intensidad,
      contenidoCifrado,
    });

    const ecosistema = await this.actualizarEcosistema.execute(nuevo.usuarioId);

    return {
      desahogoId: guardado.id,
      creadoEn: guardado.creadoEn.toISOString(),
      ecosistema,
    };
  }
}
