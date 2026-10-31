import { Boton } from '../../shared/ui/Boton.tsx'
import { formatearNumero } from './formato.ts'
import estilos from './PanelSugerencias.module.css'

interface Props {
  /** Filas que se saltaron antes de esta página. */
  desplazamiento: number
  /** Filas que trajo esta página. */
  cantidad: number
  /** La API dice si existe otra página; no entrega el total. */
  hayMas: boolean
  onAnterior: () => void
  onSiguiente: () => void
}

export function Paginacion({ desplazamiento, cantidad, hayMas, onAnterior, onSiguiente }: Props) {
  const desde = formatearNumero(desplazamiento + 1)
  const hasta = formatearNumero(desplazamiento + cantidad)

  return (
    <div className={estilos.pie}>
      <p className={estilos.conteo}>{cantidad === 0 ? 'No hay sugerencias en esta página' : <>Mostrando <strong>{`${desde}–${hasta}`}</strong></>}</p>
      <nav aria-label="Paginación" className={estilos.paginas}>
        <Boton variante="suave" onClick={onAnterior} disabled={desplazamiento === 0}>
          Anterior
        </Boton>
        <Boton variante="suave" onClick={onSiguiente} disabled={!hayMas}>
          Siguiente
        </Boton>
      </nav>
    </div>
  )
}
