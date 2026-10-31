import { formatearFecha } from '../../shared/formato.ts'
import { EtiquetaEstadoSugerencia } from '../../shared/ui/EtiquetaEstadoSugerencia.tsx'
import { Icono } from '../../shared/ui/Icono.tsx'
import { codigoCorto } from './formato.ts'
import estilos from './PanelSugerencias.module.css'
import { ESTADOS_SUGERENCIA, ETIQUETA_ESTADO_SUGERENCIA, type EstadoSugerencia, type Sugerencia } from './tipos.ts'

interface Props {
  items: Sugerencia[]
  ocupado: boolean
  /** Solo si la API permite cambiar el estado (HU-11). Si no, el estado se muestra y no se puede tocar. */
  onCambiarEstado?: (sugerencia: Sugerencia, estado: EstadoSugerencia) => void
  onVer: (sugerencia: Sugerencia) => void
}

export function TablaSugerencias({ items, ocupado, onCambiarEstado, onVer }: Props) {
  return (
    <section aria-label="Tabla de sugerencias" className={estilos.contenedorTabla} aria-busy={ocupado}>
      <table className={estilos.tabla}>
        <caption className={estilos.soloLectores}>Bandeja de sugerencias</caption>
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">Usuario</th>
            <th scope="col">Fecha</th>
            <th scope="col">Sugerencia</th>
            <th scope="col">Estado</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && !ocupado && (
            <tr>
              <td colSpan={6} className={estilos.vacio}>
                No hay sugerencias con estos filtros.
              </td>
            </tr>
          )}
          {items.map((sugerencia) => {
            const codigo = codigoCorto(sugerencia.id)
            return (
              <tr key={sugerencia.id}>
                <td className={estilos.codigo}>#{codigo}</td>
                <td className={estilos.usuario}>{sugerencia.usuario}</td>
                <td className={estilos.fecha}>{formatearFecha(sugerencia.fecha)}</td>
                <td>
                  <span className={estilos.recorte}>{sugerencia.texto}</span>
                </td>
                <td>
                  <EtiquetaEstadoSugerencia estado={sugerencia.estado} />
                </td>
                <td>
                  <div className={estilos.acciones}>
                    {onCambiarEstado && (
                      <select
                        className={estilos.selector}
                        aria-label={`Estado de la sugerencia ${codigo}`}
                        value={sugerencia.estado}
                        onChange={(e) => onCambiarEstado(sugerencia, e.target.value as EstadoSugerencia)}
                      >
                        {ESTADOS_SUGERENCIA.map((estado) => (
                          <option key={estado} value={estado}>
                            {ETIQUETA_ESTADO_SUGERENCIA[estado]}
                          </option>
                        ))}
                      </select>
                    )}
                    <button type="button" className={estilos.ver} aria-label={`Ver la sugerencia ${codigo}`} onClick={() => onVer(sugerencia)}>
                      <Icono nombre="ojo" tamano={20} />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
