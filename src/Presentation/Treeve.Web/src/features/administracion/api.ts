import { pedirApi } from '../../shared/api/clienteApi.ts'
import {
  ROLES,
  type AscenderRequest,
  type CambioDeRol,
  type CambioDeRolResponse,
  type ConsultaDeRegistros,
  type EquipoResponse,
  type ListadoResponse,
  type MiembroDelEquipo,
  type PaginaDeRegistros,
  type RegistroDeAcceso,
  type RegistroDeAccesoResponse,
  type RegistroDeRol,
  type RegistroDeRolResponse,
  type Rol,
  type RolDelEquipo,
} from './tipos.ts'

// Todo lo de /api/admin exige rol de administración, validado por el backend en cada petición: sin sesión 401, sin ese rol 403
// (y el intento queda en el registro de accesos denegados). Aquí no se decide ningún permiso.

const esRol = (valor: string): valor is Rol => (ROLES as readonly string[]).includes(valor)
const esRolDelEquipo = (valor: string): valor is RolDelEquipo => valor === 'staff' || valor === 'administrador'

/** Un rol que no se conoce no se adivina: falla en vez de mostrar un permiso equivocado. */
function rol(valor: string): Rol {
  if (!esRol(valor)) throw new Error('La API entregó un rol desconocido')
  return valor
}

function aCambio(r: CambioDeRolResponse): CambioDeRol {
  return { usuario: r.nombreDeUsuario, apodo: r.apodo, rolAnterior: rol(r.rolAnterior), rolNuevo: rol(r.rolNuevo) }
}

const consulta = ({ limite, desplazamiento }: ConsultaDeRegistros) => new URLSearchParams({ limite: String(limite), desplazamiento: String(desplazamiento) }).toString()

/** El staff y la administración, por nombre de usuario. Nunca trae nombres completos ni correos. */
export async function listarEquipo(): Promise<MiembroDelEquipo[]> {
  const respuesta = await pedirApi<EquipoResponse>('/api/admin/staff')
  return respuesta.staff.map((m) => {
    if (!esRolDelEquipo(m.rol)) throw new Error('La API entregó un rol desconocido')
    return { id: m.usuarioId, usuario: m.nombreDeUsuario, apodo: m.apodo, rol: m.rol }
  })
}

/** 200 si se ascendió; 400 (mensaje para mostrar) si no existe esa persona, ya es staff o administradora, o su rol cambió mientras tanto. */
export async function ascender(nombreDeUsuario: string): Promise<CambioDeRol> {
  const cuerpo: AscenderRequest = { nombreDeUsuario }
  return aCambio(await pedirApi<CambioDeRolResponse>('/api/admin/staff', { method: 'POST', body: JSON.stringify(cuerpo) }))
}

/** 200 si se revocó (vuelve a ser usuaria regular desde su siguiente petición); 400 si no es staff, es administradora o no existe. */
export async function revocar(usuarioId: string): Promise<CambioDeRol> {
  return aCambio(await pedirApi<CambioDeRolResponse>(`/api/admin/staff/${encodeURIComponent(usuarioId)}`, { method: 'DELETE' }))
}

/** Registro inmutable de ascensos y revocaciones, del más reciente al más antiguo. */
export async function listarCambiosDeRol(c: ConsultaDeRegistros): Promise<PaginaDeRegistros<RegistroDeRol>> {
  const r = await pedirApi<ListadoResponse<RegistroDeRolResponse>>(`/api/admin/auditoria/roles?${consulta(c)}`)
  return {
    registros: r.registros.map((x) => ({
      id: x.id,
      administrador: x.administrador,
      usuarioAfectado: x.usuarioAfectado,
      rolAnterior: rol(x.rolAnterior),
      rolNuevo: rol(x.rolNuevo),
      fecha: x.ocurrioEn,
    })),
    hayMas: r.hayMas,
  }
}

/** Registro inmutable de intentos de entrar a rutas de staff o administración sin permiso, del más reciente al más antiguo. */
export async function listarAccesosDenegados(c: ConsultaDeRegistros): Promise<PaginaDeRegistros<RegistroDeAcceso>> {
  const r = await pedirApi<ListadoResponse<RegistroDeAccesoResponse>>(`/api/admin/auditoria/accesos?${consulta(c)}`)
  return {
    registros: r.registros.map((x) => ({ id: x.id, usuario: x.nombreDeUsuario, recurso: x.recurso, rolRequerido: rol(x.rolRequerido), ip: x.ip, fecha: x.ocurrioEn })),
    hayMas: r.hayMas,
  }
}
