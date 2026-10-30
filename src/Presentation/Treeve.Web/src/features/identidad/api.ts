import { pedirApi } from '../../shared/api/clienteApi.ts'
import { guardarSesion } from '../../shared/api/sesion.ts'
import type { LoginRequest, RegistroRequest, RespuestaDeRecuperacion, RestablecerRequest, SesionResponse, SolicitudDeRecuperacionRequest } from './tipos.ts'

/** HU-02: registra a la persona y deja la sesión abierta (acceso automático). */
export async function registrar(datos: RegistroRequest): Promise<void> {
  const sesion = await pedirApi<SesionResponse>('/api/auth/registro', { method: 'POST', body: JSON.stringify(datos) })
  guardarSesion(sesion)
}

/** HU-03a: inicia sesión con usuario o correo. */
export async function iniciarSesion(datos: LoginRequest): Promise<void> {
  const sesion = await pedirApi<SesionResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(datos) })
  guardarSesion(sesion)
}

/** HU-03b, paso 1: pide el enlace. La API responde 202 con el mismo mensaje exista o no el correo (nunca dice cuál fue el caso). */
export function solicitarRecuperacion(datos: SolicitudDeRecuperacionRequest): Promise<RespuestaDeRecuperacion> {
  return pedirApi<RespuestaDeRecuperacion>('/api/auth/recuperacion', { method: 'POST', body: JSON.stringify(datos) })
}

/** HU-03b, paso 3: cambia la contraseña con el token del enlace. 204 sin cuerpo; 400 VALIDACION o TOKEN_INVALIDO. */
export async function restablecerContrasena(datos: RestablecerRequest): Promise<void> {
  await pedirApi<undefined>('/api/auth/recuperacion/restablecer', { method: 'POST', body: JSON.stringify(datos) })
}
