import { pedirApi } from '../../shared/api/clienteApi.ts'
import { ESTADOS_SUGERENCIA, type EstadoSugerencia } from '../../shared/sugerencias/estados.ts'
import type { ConsultaSugerencias, FuenteDeSugerencias, RolDeStaff } from './tipos.ts'

// Espejo de los DTOs de Treeve.Api (docs/guias/api-staff.md y api-sugerencias.md). Si cambian, cambia aquí.
interface AccesoStaffResponse {
  rol: string
}

interface SugerenciaDeStaffResponse {
  sugerenciaId: string
  usuarioId: string
  nombreDeUsuario: string
  texto: string
  estado: string
  creadaEn: string
  comentario: string | null
  gestionadaEn: string | null
}

interface GestionDeSugerenciaResponse {
  sugerenciaId: string
  estado: string
  comentario: string | null
  gestionadaEn: string | null
  huboCambios: boolean
}

interface ListadoDeSugerenciasResponse {
  sugerencias: SugerenciaDeStaffResponse[]
  hayMas: boolean
}

const esEstado = (valor: string): valor is EstadoSugerencia => (ESTADOS_SUGERENCIA as readonly string[]).includes(valor)

/**
 * HU-10: punto de acceso al panel. 200 con el rol; 403 si la persona no es staff (ErrorApi con estado 403);
 * 401 si no hay sesión (el cliente de la API la olvida y la app vuelve al inicio de sesión).
 * El rol no viaja en el token: el frontend no lo deduce, lo pregunta.
 */
export async function consultarAcceso(): Promise<RolDeStaff> {
  const { rol } = await pedirApi<AccesoStaffResponse>('/api/staff/acceso')
  if (rol !== 'staff' && rol !== 'administrador') throw new Error('La API entregó un rol desconocido')
  return rol
}

/** El filtro "hasta" de la pantalla incluye ese día; el de la API no. Se envía el día siguiente. */
export function diaSiguiente(dia: string): string {
  const [anio, mes, diaDelMes] = dia.split('-').map(Number)
  return new Date(Date.UTC(anio ?? 0, (mes ?? 1) - 1, (diaDelMes ?? 1) + 1)).toISOString().slice(0, 10)
}

export function parametrosDeConsulta(consulta: ConsultaSugerencias): string {
  const parametros = new URLSearchParams()
  if (consulta.estado) parametros.set('estado', consulta.estado)
  const usuario = consulta.usuario?.trim()
  if (usuario) parametros.set('usuario', usuario)
  // Sin zona horaria, la API toma las fechas como hora de Colombia, que es la que ve la persona de staff.
  if (consulta.desde) parametros.set('desde', consulta.desde)
  if (consulta.hasta) parametros.set('hasta', diaSiguiente(consulta.hasta))
  if (consulta.orden) parametros.set('orden', consulta.orden)
  parametros.set('limite', String(consulta.limite))
  parametros.set('desplazamiento', String(consulta.desplazamiento))
  return parametros.toString()
}

/** La fuente real de sugerencias para el staff: consulta con filtros, orden y paginación, y gestiona (HU-11). El resumen con cifras no existe en la API. */
export function crearFuenteDeStaff(): FuenteDeSugerencias {
  return {
    async consultar(consulta) {
      const respuesta = await pedirApi<ListadoDeSugerenciasResponse>(`/api/staff/sugerencias?${parametrosDeConsulta(consulta)}`)
      return {
        items: respuesta.sugerencias.map((s) => {
          if (!esEstado(s.estado)) throw new Error('La API entregó un estado desconocido')
          return {
            id: s.sugerenciaId,
            usuario: s.nombreDeUsuario,
            fecha: s.creadaEn,
            texto: s.texto,
            estado: s.estado,
            ...(s.comentario ? { comentario: s.comentario } : {}),
            ...(s.gestionadaEn ? { gestionadaEn: s.gestionadaEn } : {}),
          }
        }),
        hayMas: respuesta.hayMas,
      }
    },
    /** HU-11: cambia el estado y/o deja un comentario. Se envía solo lo que cambió; `comentario: ""` quita el comentario. */
    async actualizar(id, cambios) {
      const respuesta = await pedirApi<GestionDeSugerenciaResponse>(`/api/staff/sugerencias/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(cambios),
      })
      return { huboCambios: respuesta.huboCambios }
    },
  }
}
