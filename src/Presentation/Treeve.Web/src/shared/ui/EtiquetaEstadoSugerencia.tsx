import { ETIQUETA_ESTADO_SUGERENCIA, type EstadoSugerencia } from '../sugerencias/estados.ts'
import estilos from './EtiquetaEstadoSugerencia.module.css'

/** El estado siempre va escrito: el color y el punto solo lo refuerzan. */
export function EtiquetaEstadoSugerencia({ estado }: { estado: EstadoSugerencia }) {
  return (
    <span className={estilos.etiqueta} data-estado={estado}>
      <span className={estilos.punto} aria-hidden="true" />
      {ETIQUETA_ESTADO_SUGERENCIA[estado]}
    </span>
  )
}
