import { pedirApi } from '../../shared/api/clienteApi.ts'
import type { EnviarSugerenciaRequest, MisSugerenciasResponse, SugerenciaEnviada, SugerenciaPropia } from './tipos.ts'

/** HU-09: envía una sugerencia. La persona sale del token, nunca del cuerpo. */
export function enviarSugerencia(datos: EnviarSugerenciaRequest): Promise<SugerenciaEnviada> {
  return pedirApi<SugerenciaEnviada>('/api/sugerencias', { method: 'POST', body: JSON.stringify(datos) })
}

/** HU-09: el historial propio, de la más reciente a la más antigua. Nunca trae las de otras personas. */
export async function listarMisSugerencias(): Promise<SugerenciaPropia[]> {
  const respuesta = await pedirApi<MisSugerenciasResponse>('/api/sugerencias')
  return respuesta.sugerencias
}
