import { useState } from 'react'
import { Boton } from '../../shared/ui/Boton.tsx'
import { Dialogo } from '../../shared/ui/Dialogo.tsx'
import { ETIQUETAS } from './etiquetas.ts'
import estilos from './FlujoDesahogo.module.css'
import { HojaDePapel } from './HojaDePapel.tsx'
import { IconoEmocion } from './IconoEmocion.tsx'
import { MensajeDeApoyo } from './MensajeDeApoyo.tsx'
import { PanelEmociones } from './PanelEmociones.tsx'
import type { Emocion, MensajeDeApoyo as Mensaje } from './tipos.ts'

interface Props {
  abierto: boolean
  /** Se cierra la ventana sin haber guardado nada. */
  onCerrar: () => void
  /** El desahogo quedó guardado y la persona ya vio su mensaje: app/ decide qué sigue (regar el espacio verde). */
  alGuardar: () => void
}

type Paso = { nombre: 'emocion' } | { nombre: 'escribir'; emocion: Emocion } | { nombre: 'mensaje'; mensaje: Mensaje }

/**
 * Orquesta HU-04 → HU-05 → HU-06 en una ventana: se elige la emoción (al elegirla avanza), se escribe y,
 * al guardar, se muestra el mensaje de apoyo que devuelve la API.
 * Solo la emoción y el mensaje viven en memoria; el texto lo gestiona HojaDePapel y nunca se persiste.
 * Al cerrar la ventana todo se descarta.
 */
export function FlujoDesahogo({ abierto, onCerrar, alGuardar }: Props) {
  // La ventana existe solo mientras está abierta: así cada apertura empieza de cero.
  return abierto ? <Ventana onCerrar={onCerrar} alGuardar={alGuardar} /> : null
}

function Ventana({ onCerrar, alGuardar }: Pick<Props, 'onCerrar' | 'alGuardar'>) {
  const [paso, setPaso] = useState<Paso>({ nombre: 'emocion' })

  // Si el desahogo ya se guardó, cerrar la ventana (con el botón, la X o Esc) también avisa que quedó guardado.
  const cerrar = paso.nombre === 'mensaje' ? alGuardar : onCerrar

  return (
    <Dialogo abierto titulo={paso.nombre === 'mensaje' ? 'Un mensaje para ti' : '¿Cómo te sientes hoy?'} onCerrar={cerrar}>
      {paso.nombre === 'emocion' && <PanelEmociones onElegir={(emocion) => setPaso({ nombre: 'escribir', emocion })} />}
      {paso.nombre === 'escribir' && (
        <div className={estilos.escribir}>
          <div className={estilos.cabecera}>
            <span className={estilos.emocion} data-emocion={paso.emocion}>
              <IconoEmocion emocion={paso.emocion} />
              <span>{ETIQUETAS[paso.emocion]}</span>
            </span>
            <Boton variante="suave" onClick={() => setPaso({ nombre: 'emocion' })}>
              Cambiar emoción
            </Boton>
          </div>
          <p className={estilos.ayuda}>Escribe libremente. Este es tu espacio seguro y cada palabra riega tu espacio verde.</p>
          <HojaDePapel emocion={paso.emocion} onGuardado={(mensaje) => setPaso({ nombre: 'mensaje', mensaje })} />
        </div>
      )}
      {paso.nombre === 'mensaje' && <MensajeDeApoyo mensaje={paso.mensaje} onSeguir={alGuardar} />}
    </Dialogo>
  )
}
