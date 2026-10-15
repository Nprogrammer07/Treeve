import type { ChequearSalud } from '../../../application/use-cases/ChequearSalud';
import { asyncHandler } from '../middlewares/asyncHandler';

export class SaludController {
  constructor(private readonly chequearSalud: ChequearSalud) {}

  verificar = asyncHandler(async (_req, res) => {
    const estado = await this.chequearSalud.execute();
    res.setHeader('Cache-Control', 'no-store');
    res.status(estado.status === 'ok' ? 200 : 503).json(estado);
  });
}
