import type { ErrorRequestHandler } from 'express';
import { ForbiddenError, UnauthenticatedError, ValidationError } from '../../../domain/errors';

export const manejarErrores: ErrorRequestHandler = (err, _req, res, _next) => {
  const responder = (status: number, code: string, message: string) => {
    res.status(status).json({ error: { code, message } });
  };

  if (err instanceof ValidationError) return responder(400, err.code, err.message);
  if (err instanceof UnauthenticatedError) return responder(401, err.code, err.message);
  if (err instanceof ForbiddenError) return responder(403, err.code, err.message);
  if (err instanceof SyntaxError) return responder(400, 'INVALID_JSON', 'JSON mal formado');

  // Nunca se devuelve el detalle interno ni el contenido de la petición.
  console.error('[error]', err instanceof Error ? `${err.name}: ${err.message}` : 'desconocido');
  return responder(500, 'INTERNAL_ERROR', 'Error interno del servidor');
};
