export class DomainError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class ValidationError extends DomainError {
  constructor(message: string) { super(message, 'VALIDATION_ERROR'); }
}
export class UnauthenticatedError extends DomainError {
  constructor(message = 'Credenciales ausentes o inválidas') { super(message, 'UNAUTHENTICATED'); }
}
export class ForbiddenError extends DomainError {
  constructor(message = 'No tienes permiso para esta acción') { super(message, 'FORBIDDEN'); }
}
/** Fallo de persistencia: el mensaje es interno y NO se expone al cliente. */
export class PersistenceError extends DomainError {
  constructor(message: string) { super(message, 'PERSISTENCE_ERROR'); }
}
