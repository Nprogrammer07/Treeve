import type { CasosDeUsoFactory } from '../../../application/CasosDeUsoUsuario';
import { asyncHandler } from '../middlewares/asyncHandler';

export class EcosistemaController {
  constructor(private readonly casosDeUso: CasosDeUsoFactory) {}

  actualizar = asyncHandler(async (req, res) => {
    const credenciales = req.auth!;
    const ecosistema = await this.casosDeUso(credenciales).actualizarEcosistema.execute(credenciales.userId);
    res.status(200).json({ ecosistema });
  });
}
