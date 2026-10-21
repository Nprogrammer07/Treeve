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
