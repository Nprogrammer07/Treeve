import { pedirApi } from '../../shared/api/clienteApi.ts'
import type { CrearNotaRequest, CrearNotaResponse } from './tipos.ts'

export function guardarDesahogo(datos: CrearNotaRequest): Promise<CrearNotaResponse> {
  return pedirApi<CrearNotaResponse>('/api/desahogos', {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}
