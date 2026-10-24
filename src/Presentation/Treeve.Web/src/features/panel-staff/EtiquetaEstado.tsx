import estilos from './PanelSugerencias.module.css'
import { ETIQUETA_ESTADO, type EstadoSugerencia } from './tipos.ts'

/** El estado siempre va escrito: el color y el punto solo lo refuerzan. */
export function EtiquetaEstado({ estado }: { estado: EstadoSugerencia }) {
  return (
    <span className={estilos.etiquetaEstado} data-estado={estado}>
      <span className={estilos.punto} aria-hidden="true" />
      {ETIQUETA_ESTADO[estado]}
    </span>
  )
}
