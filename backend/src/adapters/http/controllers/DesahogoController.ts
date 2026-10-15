import { z } from 'zod';
import type { CasosDeUsoFactory } from '../../../application/CasosDeUsoUsuario';
import { MAX_CONTENIDO } from '../../../domain/entities/Desahogo';
import { ValidationError } from '../../../domain/errors';
import { asyncHandler } from '../middlewares/asyncHandler';

const esquemaRegistro = z.object({
  emocionId: z.number().int().positive(),
  intensidad: z.number().int().min(1).max(5),
  contenido: z.string().min(1).max(MAX_CONTENIDO),
});

export class DesahogoController {
  constructor(private readonly casosDeUso: CasosDeUsoFactory) {}

  registrar = asyncHandler(async (req, res) => {
    const parsed = esquemaRegistro.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      );
    }
    const credenciales = req.auth!;
    const salida = await this.casosDeUso(credenciales).registrarDesahogo.execute({
      usuarioId: credenciales.userId, // el id sale del JWT, nunca del body
      ...parsed.data,
    });
    res.status(201).json(salida);
  });
}
