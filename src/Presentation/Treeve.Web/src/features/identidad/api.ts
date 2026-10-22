import { pedirApi } from '../../shared/api/clienteApi.ts'
import { guardarSesion } from '../../shared/api/sesion.ts'
import type { LoginRequest, RegistroRequest, SesionResponse } from './tipos.ts'

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
