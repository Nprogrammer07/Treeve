// Espejo de los DTOs de Treeve.Api (docs/guias/api-administracion.md, HU-12). Si cambia la API, cambia aquí.
// Los roles viajan en minúsculas: usuario, staff, administrador.
export const ROLES = ['usuario', 'staff', 'administrador'] as const
export type Rol = (typeof ROLES)[number]

/** Quienes aparecen en la lista del equipo: el staff y la administración. */
export type RolDelEquipo = Extract<Rol, 'staff' | 'administrador'>

export interface MiembroResponse {
  usuarioId: string
  nombreDeUsuario: string
  apodo: string
  rol: string
}

export interface EquipoResponse {
  staff: MiembroResponse[]
}

export interface AscenderRequest {
  nombreDeUsuario: string
}

export interface CambioDeRolResponse {
  usuarioId: string
  nombreDeUsuario: string
  apodo: string
  rolAnterior: string
  rolNuevo: string
  ocurrioEn: string
}

export interface RegistroDeRolResponse {
  id: string
  administradorId: string
  administrador: string | null
  usuarioAfectadoId: string
  usuarioAfectado: string | null
  rolAnterior: string
  rolNuevo: string
  ocurrioEn: string
}

export interface RegistroDeAccesoResponse {
  id: string
  usuarioId: string
  nombreDeUsuario: string | null
  ocurrioEn: string
  ip: string | null
  recurso: string
  rolRequerido: string
}

export interface ListadoResponse<T> {
  registros: T[]
  hayMas: boolean
}

// ---------- Lo que usa la pantalla ----------

export interface MiembroDelEquipo {
  id: string
  usuario: string
  apodo: string
  rol: RolDelEquipo
}

/** El resultado de ascender o revocar: nunca trae el nombre completo ni el correo. */
export interface CambioDeRol {
  usuario: string
  apodo: string
  rolAnterior: Rol
  rolNuevo: Rol
}

export interface RegistroDeRol {
  id: string
  /** null si la persona ya no existe. */
  administrador: string | null
  usuarioAfectado: string | null
  rolAnterior: Rol
  rolNuevo: Rol
  fecha: string
}

export interface RegistroDeAcceso {
  id: string
  /** null si la persona ya no existe. */
  usuario: string | null
  recurso: string
  rolRequerido: Rol
  ip: string | null
  fecha: string
}

export interface ConsultaDeRegistros {
  limite: number
  desplazamiento: number
}

export interface PaginaDeRegistros<T> {
  registros: T[]
  /** Hay otra página después de esta. La API no entrega el total. */
  hayMas: boolean
}
