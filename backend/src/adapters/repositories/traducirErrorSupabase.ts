import { ForbiddenError, PersistenceError, ValidationError } from '../../domain/errors';

/** Traduce códigos SQLSTATE de PostgREST a errores de dominio (sin filtrar detalles internos). */
export function traducirErrorSupabase(error: { code?: string; message: string }): Error {
  switch (error.code) {
    case '42501': return new ForbiddenError();                       // RLS / privilegios
    case '23503': return new ValidationError('Referencia inválida (por ejemplo, emoción inexistente)');
    case '23514': return new ValidationError('Los datos no cumplen las restricciones definidas');
    default:      return new PersistenceError(error.message);
  }
}
