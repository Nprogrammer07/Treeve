import { useId, useState, type FormEvent } from 'react'
import { Boton } from '../../shared/ui/Boton.tsx'
import { ETIQUETAS } from './etiquetas.ts'
import { IconoEmocion } from './IconoEmocion.tsx'
import estilos from './PanelEmociones.module.css'
import { EMOCIONES, type Emocion } from './tipos.ts'

interface Props {
  onContinuar: (emocion: Emocion) => void
}

/** HU-04: elegir la emoción con ícono y texto. Se opera con teclado (flechas) y con lector de pantalla. */
export function PanelEmociones({ onContinuar }: Props) {
  const nombreGrupo = useId()
  const [elegida, setElegida] = useState<Emocion | null>(null)

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (elegida) onContinuar(elegida)
  }

  return (
    <form onSubmit={enviar} className={estilos.panel}>
      <fieldset className={estilos.grupo}>
        <legend className={estilos.pregunta}>¿Cómo te sientes ahora?</legend>
        <div className={estilos.rejilla}>
          {EMOCIONES.map((emocion) => (
            <label key={emocion} className={estilos.opcion}>
              <input
                type="radio"
                name={nombreGrupo}
                value={emocion}
                checked={elegida === emocion}
                onChange={() => setElegida(emocion)}
                className={estilos.entrada}
              />
              <span className={estilos.tarjeta}>
                <IconoEmocion emocion={emocion} />
                <span>{ETIQUETAS[emocion]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Boton type="submit" disabled={elegida === null}>
        Continuar
      </Boton>
    </form>
  )
}
