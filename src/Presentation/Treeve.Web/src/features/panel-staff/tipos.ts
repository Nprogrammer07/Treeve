// Modelo de la bandeja de sugerencias (HU-09 y HU-11) tal como la entrega la API real
// (docs/guias/api-sugerencias.md y api-staff.md). Nunca contiene el texto de un desahogo: el staff no tiene acceso a ellos (HU-05).
import { ESTADOS_SUGERENCIA, ETIQUETA_ESTADO_SUGERENCIA, type EstadoSugerencia } from '../../shared/sugerencias/estados.ts'

export { ESTADOS_SUGERENCIA, ETIQUETA_ESTADO_SUGERENCIA }
export type { EstadoSugerencia }

export type RolDeStaff = 'staff' | 'administrador'

export interface Sugerencia {
  id: string
  /** Nombre de usuario de quien sugirió. Nunca su correo ni su nombre completo. */
  usuario: string
  /** Fecha y hora en ISO 8601. */
  fecha: string
  texto: string
  estado: EstadoSugerencia
  /** Comentario del staff, visible para quien sugirió (HU-11). Hay uno solo por sugerencia. */
  comentario?: string
  /** Cuándo el staff cambió el estado o el comentario por última vez. */
  gestionadaEn?: string
}

export type OrdenSugerencias = 'recientes' | 'antiguas' | 'usuario'

export const ETIQUETA_ORDEN: Record<OrdenSugerencias, string> = {
  recientes: 'Más recientes primero',
  antiguas: 'Más antiguas primero',
  usuario: 'Por usuario (A a Z)',
}

/** El comentario del staff admite hasta 500 caracteres (HU-11). Ayuda de UX: decide el backend. */
export const LONGITUD_MAXIMA_COMENTARIO = 500

export interface ConsultaSugerencias {
  estado?: EstadoSugerencia
  /** Nombre de usuario exacto (la API no distingue mayúsculas). */
  usuario?: string
  /** Primer día (AAAA-MM-DD), incluido. */
  desde?: string
  /** Último día (AAAA-MM-DD), incluido. */
  hasta?: string
  /** `antiguas` pone primero las que más llevan esperando; `usuario` ordena por nombre de usuario. */
  orden?: OrdenSugerencias
  limite: number
  desplazamiento: number
}

export interface PaginaDeSugerencias {
  items: Sugerencia[]
  /** Hay otra página después de esta. La API no entrega el total. */
  hayMas: boolean
}

export interface ResumenSugerencias {
  total: number
  pendientes: number
  enRevision: number
  implementadas: number
  rechazadas: number
}

/** Respuesta a gestionar una sugerencia. Si `huboCambios` es false, se envió lo mismo que ya había: no se guardó nada ni se avisó a nadie. */
export interface ResultadoDeGestion {
  huboCambios: boolean
}

export interface CambiosDeSugerencia {
  estado?: EstadoSugerencia
  comentario?: string
}

/**
 * Lo que el panel necesita del backend. Los filtros y la paginación los hace el servidor: no se trae todo al navegador.
 *
 * `actualizar` (HU-11: cambiar el estado y comentar) y `resumen` (cifras por estado) son opcionales. La API ya ofrece lo primero;
 * lo segundo todavía no. Si algo falta, el panel no muestra ese control en vez de inventar datos.
 */
export interface FuenteDeSugerencias {
  consultar: (consulta: ConsultaSugerencias) => Promise<PaginaDeSugerencias>
  actualizar?: (id: string, cambios: CambiosDeSugerencia) => Promise<ResultadoDeGestion>
  resumen?: () => Promise<ResumenSugerencias>
}
