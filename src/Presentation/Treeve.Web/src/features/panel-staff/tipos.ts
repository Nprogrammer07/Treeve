// Modelo de la bandeja de sugerencias (HU-09 y HU-11) tal como la necesita la pantalla.
// OJO: todavía NO es el contrato de la API (no existe). Cuando se publique, api.ts lo traducirá a este modelo.
// Nunca contiene el texto de un desahogo: el panel de staff no tiene acceso a ellos (HU-05).

export const ESTADOS = ['pendiente', 'en-revision', 'implementada', 'rechazada'] as const
export type EstadoSugerencia = (typeof ESTADOS)[number]

export const ETIQUETA_ESTADO: Record<EstadoSugerencia, string> = {
  pendiente: 'Pendiente',
  'en-revision': 'En revisión',
  implementada: 'Implementada',
  rechazada: 'Rechazada',
}

export interface Sugerencia {
  id: string
  /** Apodo de quien sugirió. Nunca su nombre completo ni su correo. */
  usuario: string
  /** Fecha y hora en ISO 8601. */
  fecha: string
  texto: string
  estado: EstadoSugerencia
  /** Comentario del staff, visible para quien sugirió (HU-11). */
  comentario?: string
}

export type OrdenSugerencias = 'recientes' | 'antiguas'

export interface ConsultaSugerencias {
  /** Busca en el apodo de quien sugirió y en el texto de la sugerencia. */
  busqueda: string
  estado: EstadoSugerencia | 'todos'
  /** Día inicial y final (AAAA-MM-DD), ambos incluidos. */
  desde?: string
  hasta?: string
  orden: OrdenSugerencias
  /** Empieza en 1. */
  pagina: number
  tamano: number
}

export interface PaginaDeSugerencias {
  items: Sugerencia[]
  /** Cuántas sugerencias cumplen la consulta en total, no solo las de esta página. */
  total: number
}

export interface ResumenSugerencias {
  total: number
  pendientes: number
  enRevision: number
  implementadas: number
  rechazadas: number
}

export interface CambiosDeSugerencia {
  estado?: EstadoSugerencia
  comentario?: string
}

/**
 * Lo que el panel necesita del backend. La paginación y los filtros los hace el servidor:
 * con más de mil sugerencias (HU-11) no se trae todo al navegador.
 */
export interface FuenteDeSugerencias {
  consultar: (consulta: ConsultaSugerencias) => Promise<PaginaDeSugerencias>
  resumen: () => Promise<ResumenSugerencias>
  actualizar: (id: string, cambios: CambiosDeSugerencia) => Promise<Sugerencia>
}
