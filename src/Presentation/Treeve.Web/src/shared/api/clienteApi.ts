// Único punto de contacto del frontend con el backend (Treeve.Api).
// El frontend es presentación: muestra y pide; las reglas de negocio las decide la API.
import { borrarSesion, obtenerToken } from './sesion.ts'

const urlBase = import.meta.env.VITE_API_URL ?? ''

interface DetalleDelError {
  codigo?: string
  mensajeParaUsuario?: string
  reintentarEnSeg?: number
}

export class ErrorApi extends Error {
  readonly estado: number
  /** Código estable del error (p. ej. CREDENCIALES_INVALIDAS), si la API lo envió. */
  readonly codigo?: string
  /** Texto que la API escribió para mostrarse a la persona, tal cual. */
  readonly mensajeParaUsuario?: string
  /** Segundos de espera de la cabecera Retry-After (cuenta bloqueada). */
  readonly reintentarEnSeg?: number

  constructor(estado: number, detalle: DetalleDelError = {}) {
    // Nunca incluir el cuerpo de la petición: puede contener el texto de un desahogo o una contraseña.
    super(`La API respondió con estado ${estado}`)
    this.name = 'ErrorApi'
    this.estado = estado
    this.codigo = detalle.codigo
    this.mensajeParaUsuario = detalle.mensajeParaUsuario
    this.reintentarEnSeg = detalle.reintentarEnSeg
  }
}

/** Los errores de la API tienen la forma { codigo, mensaje } (docs/guias/api-identidad.md). */
async function leerDetalle(respuesta: Response): Promise<DetalleDelError> {
  const detalle: DetalleDelError = {}
  const espera = Number(respuesta.headers.get('Retry-After'))
  if (respuesta.headers.has('Retry-After') && Number.isFinite(espera)) detalle.reintentarEnSeg = espera
  try {
    const cuerpo: unknown = await respuesta.json()
    if (typeof cuerpo === 'object' && cuerpo !== null) {
      const { codigo, mensaje } = cuerpo as Record<string, unknown>
      if (typeof codigo === 'string') detalle.codigo = codigo
      if (typeof mensaje === 'string') detalle.mensajeParaUsuario = mensaje
    }
  } catch {
    // La respuesta no era JSON: queda solo el estado HTTP.
  }
  return detalle
}

export async function pedirApi<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const cabeceras = new Headers(opciones.headers)
  cabeceras.set('Accept', 'application/json')
  if (opciones.body !== undefined && !cabeceras.has('Content-Type')) cabeceras.set('Content-Type', 'application/json')
  const token = obtenerToken()
  if (token) cabeceras.set('Authorization', `Bearer ${token}`)

  const respuesta = await fetch(`${urlBase}${ruta}`, { ...opciones, headers: cabeceras })

  if (!respuesta.ok) {
    const detalle = await leerDetalle(respuesta)
    // Token vencido o desconocido: se olvida para que la app vuelva a pedir el inicio de sesión.
    if (respuesta.status === 401 && detalle.codigo === 'NO_AUTENTICADO') borrarSesion()
    throw new ErrorApi(respuesta.status, detalle)
  }

  return (respuesta.status === 204 ? undefined : await respuesta.json()) as T
}
