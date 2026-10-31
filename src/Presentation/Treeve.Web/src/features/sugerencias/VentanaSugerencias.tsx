import { useState } from 'react'
import { Boton } from '../../shared/ui/Boton.tsx'
import { Dialogo } from '../../shared/ui/Dialogo.tsx'
import { FormularioSugerencia } from './FormularioSugerencia.tsx'
import { HistorialSugerencias } from './HistorialSugerencias.tsx'
import estilos from './VentanaSugerencias.module.css'

interface Props {
  abierto: boolean
  onCerrar: () => void
}

type Vista = 'enviar' | 'enviada' | 'historial'

const TITULOS: Record<Vista, string> = {
  enviar: 'Enviar una sugerencia',
  enviada: 'Sugerencia enviada',
  historial: 'Mis sugerencias',
}

/** HU-09: enviar una sugerencia, ver la confirmación y consultar el historial propio, todo en una ventana. */
export function VentanaSugerencias({ abierto, onCerrar }: Props) {
  // La ventana existe solo mientras está abierta: así cada apertura empieza en el formulario, sin restos.
  return abierto ? <Ventana onCerrar={onCerrar} /> : null
}

function Ventana({ onCerrar }: Pick<Props, 'onCerrar'>) {
  const [vista, setVista] = useState<Vista>('enviar')

  return (
    <Dialogo abierto titulo={TITULOS[vista]} onCerrar={onCerrar}>
      {vista === 'enviar' && (
        <>
          <FormularioSugerencia onEnviada={() => setVista('enviada')} />
          <Boton variante="suave" onClick={() => setVista('historial')} className={estilos.cambio}>
            Ver mis sugerencias
          </Boton>
        </>
      )}
      {vista === 'enviada' && (
        <div className={estilos.confirmacion}>
          <p className={estilos.gracias}>¡Gracias! Recibimos tu sugerencia y el equipo la va a revisar.</p>
          <div className={estilos.acciones}>
            <Boton onClick={() => setVista('enviar')}>Enviar otra</Boton>
            <Boton variante="suave" onClick={() => setVista('historial')}>
              Ver mis sugerencias
            </Boton>
          </div>
        </div>
      )}
      {vista === 'historial' && (
        <>
          <HistorialSugerencias />
          <Boton variante="suave" onClick={() => setVista('enviar')} className={estilos.cambio}>
            Enviar una sugerencia
          </Boton>
        </>
      )}
    </Dialogo>
  )
}
