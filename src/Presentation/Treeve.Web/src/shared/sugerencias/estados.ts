// Estados de una sugerencia (HU-09 / HU-11), con los mismos valores que escribe la API (docs/guias/api-sugerencias.md).
export const ESTADOS_SUGERENCIA = ['pendiente', 'en_revision', 'implementada', 'rechazada'] as const

export type EstadoSugerencia = (typeof ESTADOS_SUGERENCIA)[number]

export const ETIQUETA_ESTADO_SUGERENCIA: Record<EstadoSugerencia, string> = {
  pendiente: 'Pendiente',
  en_revision: 'En revisión',
  implementada: 'Implementada',
  rechazada: 'Rechazada',
}
