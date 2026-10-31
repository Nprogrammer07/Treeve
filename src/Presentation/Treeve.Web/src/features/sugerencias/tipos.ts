import type { EstadoSugerencia } from '../../shared/sugerencias/estados.ts'

// Espejo de los DTOs de Treeve.Api (docs/guias/api-sugerencias.md). Si cambia la API, cambia aquí.
// Ayuda de UX para el contador. Quien decide el límite es el backend, que vuelve a validar.
export const LONGITUD_MAXIMA_SUGERENCIA = 1000

export interface EnviarSugerenciaRequest {
  texto: string
}

export interface SugerenciaEnviada {
  sugerenciaId: string
  creadaEn: string
  estado: EstadoSugerencia
}

export interface SugerenciaPropia {
  sugerenciaId: string
  texto: string
  estado: EstadoSugerencia
  creadaEn: string
  /** Respuesta del staff (HU-11), o null si no hay. Hay una sola: si el staff escribe otra, reemplaza a la anterior. */
  comentario: string | null
  /** Cuándo el staff cambió el estado o el comentario por última vez, o null si nunca. No dice quién respondió. */
  respondidaEn: string | null
}

export interface MisSugerenciasResponse {
  sugerencias: SugerenciaPropia[]
}
