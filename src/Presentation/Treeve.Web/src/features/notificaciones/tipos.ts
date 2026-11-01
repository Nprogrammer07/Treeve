// Espejo de los DTOs de Treeve.Api (docs/guias/api-administracion.md, sección "Notificaciones", HU-12 y HU-11).
// Si cambia la API, cambia aquí.
export const TIPOS_DE_AVISO = ['ascendido_a_staff', 'staff_revocado', 'sugerencia_respondida'] as const
export type TipoDeAviso = (typeof TIPOS_DE_AVISO)[number]

export interface NotificacionResponse {
  notificacionId: string
  tipo: string
  mensaje: string
  creadaEn: string
  leida: boolean
}

export interface MisNotificacionesResponse {
  notificaciones: NotificacionResponse[]
}

/** Un aviso tal como lo usa la pantalla. El texto lo decide el backend y se muestra tal cual. */
export interface Notificacion {
  id: string
  /** "otro" si el backend suma un tipo de aviso que esta versión aún no conoce: igual se muestra su mensaje. */
  tipo: TipoDeAviso | 'otro'
  mensaje: string
  creadaEn: string
  leida: boolean
}
