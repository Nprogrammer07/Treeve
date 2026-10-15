// Único punto de contacto del frontend con el backend (Treeve.Api).
// El frontend es presentación: muestra y pide; las reglas de negocio las decide la API.

const urlBase = import.meta.env.VITE_API_URL ?? ''

export class ErrorApi extends Error {
  readonly estado: number

  constructor(estado: number) {
    // Nunca incluir el cuerpo de la petición: puede contener el texto de un desahogo.
    super(`La API respondió con estado ${estado}`)
    this.name = 'ErrorApi'
    this.estado = estado
  }
}

export async function pedirApi<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const respuesta = await fetch(`${urlBase}${ruta}`, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', ...opciones.headers },
  })

  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status)
  }

  return (respuesta.status === 204 ? undefined : await respuesta.json()) as T
}
