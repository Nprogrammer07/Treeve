import type { Rol } from './tipos.ts'

export const ETIQUETA_ROL: Record<Rol, string> = {
  usuario: 'Usuario',
  staff: 'Staff',
  administrador: 'Administración',
}

/** Los registros no guardan a quien ya no existe: se dice así, sin inventar un nombre. */
export const PERSONA_ELIMINADA = 'Persona eliminada'

/** Cuántas filas se piden por página. */
export const TAMANO_DE_PAGINA = 10
