// Espejo de los DTOs de Treeve.Api (docs/guias/api-identidad.md). Si cambia la API, cambia aquí.
export interface RegistroRequest {
  nombreCompleto: string
  apodo: string
  nombreDeUsuario: string
  contrasena: string
  correo?: string
  motivoDeRegistro?: string
}

export interface LoginRequest {
  identificador: string
  contrasena: string
}

export interface SesionResponse {
  usuarioId: string
  apodo: string
  token: string
  expiraEn: string
}

export type CampoRegistro = 'nombreCompleto' | 'apodo' | 'nombreDeUsuario' | 'correo' | 'contrasena'
export type ErroresRegistro = Partial<Record<CampoRegistro, string>>

export type CampoLogin = 'identificador' | 'contrasena'
export type ErroresLogin = Partial<Record<CampoLogin, string>>

// HU-03b · Recuperar la contraseña (docs/guias/api-identidad.md)
export interface SolicitudDeRecuperacionRequest {
  correo: string
}

/** Siempre el mismo mensaje exista o no el correo: la interfaz lo muestra tal cual y nada más. */
export interface RespuestaDeRecuperacion {
  mensaje: string
}

export interface RestablecerRequest {
  token: string
  contrasena: string
}

export type CampoRestablecer = 'contrasena' | 'confirmacion'
export type ErroresRestablecer = Partial<Record<CampoRestablecer, string>>
