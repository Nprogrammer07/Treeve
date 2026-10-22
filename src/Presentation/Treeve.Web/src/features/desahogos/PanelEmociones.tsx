import { ETIQUETAS } from './etiquetas.ts'
import { IconoEmocion } from './IconoEmocion.tsx'
import estilos from './PanelEmociones.module.css'
import { EMOCIONES, type Emocion } from './tipos.ts'

interface Props {
  onElegir: (emocion: Emocion) => void
}

/**
 * HU-04: elegir la emoción, con ícono, nombre escrito y un color de apoyo (nunca solo color).
 * Cada emoción es un botón: elegirla avanza al paso siguiente. Con botones y no con una lista de opciones
 * (radios) se evita que moverse con las flechas del teclado cambie de pantalla sin querer.
 */
export function PanelEmociones({ onElegir }: Props) {
  return (
    <fieldset className={estilos.grupo}>
      <legend className={estilos.soloLectores}>Elige cómo te sientes</legend>
      <div className={estilos.rejilla}>
        {EMOCIONES.map((emocion) => (
          <button key={emocion} type="button" data-emocion={emocion} className={estilos.tarjeta} onClick={() => onElegir(emocion)}>
            <IconoEmocion emocion={emocion} />
            <span>{ETIQUETAS[emocion]}</span>
          </button>
        ))}
      </div>
    </fieldset>
  )
}
