import { Icono } from '../../shared/ui/Icono.tsx'
import estilos from './CampanaDeAvisos.module.css'

interface Props {
  sinLeer: number
  onClick: () => void
}

/** La campana de avisos. El número de avisos sin leer va escrito (en el nombre accesible y en la insignia), no solo en color. */
export function CampanaDeAvisos({ sinLeer, onClick }: Props) {
  const etiqueta = sinLeer === 0 ? 'Avisos' : `Avisos, ${sinLeer} sin leer`

  return (
    <button type="button" className={estilos.campana} aria-label={etiqueta} onClick={onClick}>
      <Icono nombre="campana" tamano={20} />
      {sinLeer > 0 && (
        <span className={estilos.insignia} aria-hidden="true">
          {sinLeer > 9 ? '9+' : sinLeer}
        </span>
      )}
    </button>
  )
}
