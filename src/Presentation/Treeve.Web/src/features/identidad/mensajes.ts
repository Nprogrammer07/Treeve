import { ErrorApi } from '../../shared/api/clienteApi.ts'

/**
 * Qué decirle a la persona cuando una petición de identidad falla.
 * Si la API escribió un mensaje pensado para mostrarse (400, 401, 429), se usa tal cual;
 * si no, un texto amable de respaldo (sin conexión, error del servidor...).
 */
export function mensajeDeError(error: unknown, respaldo: string): string {
  return error instanceof ErrorApi && error.mensajeParaUsuario ? error.mensajeParaUsuario : respaldo
}
