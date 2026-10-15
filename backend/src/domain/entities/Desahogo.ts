import { ValidationError } from '../errors';

export const MAX_CONTENIDO = 5000;

export interface NuevoDesahogo {
  readonly usuarioId: string;
  readonly emocionId: number;
  readonly intensidad: number; // 1..5
  readonly contenido: string;  // texto plano: solo vive en memoria
}

export interface DesahogoGuardado {
  readonly id: string;
  readonly creadoEn: Date;
}

/** Reglas de negocio invariantes de un desahogo. */
export function crearNuevoDesahogo(input: NuevoDesahogo): NuevoDesahogo {
  const contenido = input.contenido.trim();
  if (contenido.length === 0) throw new ValidationError('El desahogo no puede estar vacío');
  if (contenido.length > MAX_CONTENIDO) {
    throw new ValidationError(`El desahogo no puede superar ${MAX_CONTENIDO} caracteres`);
  }
  if (!Number.isInteger(input.intensidad) || input.intensidad < 1 || input.intensidad > 5) {
    throw new ValidationError('La intensidad debe ser un entero entre 1 y 5');
  }
  if (!Number.isInteger(input.emocionId) || input.emocionId <= 0) {
    throw new ValidationError('Emoción inválida');
  }
  return { ...input, contenido };
}
