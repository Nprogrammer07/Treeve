import { pedirApi } from '../../shared/api/clienteApi.ts'
import { TIPOS_DE_AVISO, type MisNotificacionesResponse, type Notificacion, type TipoDeAviso } from './tipos.ts'

const esTipoConocido = (tipo: string): tipo is TipoDeAviso => (TIPOS_DE_AVISO as readonly string[]).includes(tipo)

/** Los 50 avisos más recientes de la persona, de más nuevo a más antiguo. Nunca trae los de otras personas. */
export async function listarNotificaciones(): Promise<Notificacion[]> {
  const respuesta = await pedirApi<MisNotificacionesResponse>('/api/notificaciones')
  return respuesta.notificaciones.map((n) => ({
    id: n.notificacionId,
    // Un tipo nuevo no rompe nada: se muestra su mensaje, solo que sin acción propia.
    tipo: esTipoConocido(n.tipo) ? n.tipo : 'otro',
    mensaje: n.mensaje,
    creadaEn: n.creadaEn,
    leida: n.leida,
  }))
}

/** 204 al marcarlo (marcarlo otra vez no cambia nada). 403 si el aviso es de otra persona o no existe: la misma respuesta para no revelar cuál. */
export async function marcarComoLeida(notificacionId: string): Promise<void> {
  await pedirApi<undefined>(`/api/notificaciones/${encodeURIComponent(notificacionId)}/leida`, { method: 'POST' })
}
