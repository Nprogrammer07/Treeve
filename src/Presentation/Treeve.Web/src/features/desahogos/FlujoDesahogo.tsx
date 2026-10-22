import { useState } from 'react'
import { Boton } from '../../shared/ui/Boton.tsx'
import { Dialogo } from '../../shared/ui/Dialogo.tsx'
import { ETIQUETAS } from './etiquetas.ts'
import estilos from './FlujoDesahogo.module.css'
import { HojaDePapel } from './HojaDePapel.tsx'
import { IconoEmocion } from './IconoEmocion.tsx'
import { PanelEmociones } from './PanelEmociones.tsx'
import type { Emocion } from './tipos.ts'

interface Props {
  abierto: boolean
  onCerrar: () => void
  /** Se llama cuando el desahogo quedó guardado. app/ decide qué sigue (por ejemplo, regar el espacio verde). */
  alGuardar: () => void
}

/**
 * Orquesta HU-04 → HU-05 en una ventana: primero se elige la emoción (al elegirla avanza) y luego se escribe.
 * El mensaje de apoyo (HU-06) se conectará aquí cuando se defina su contrato con la API.
 * Solo la emoción elegida vive en memoria; el texto lo gestiona HojaDePapel y nunca se persiste.
 * Al cerrar la ventana todo se descarta.
 */
export function FlujoDesahogo({ abierto, onCerrar, alGuardar }: Props) {
  return (
    <Dialogo abierto={abierto} titulo="¿Cómo te sientes hoy?" onCerrar={onCerrar}>
      <Pasos alGuardar={alGuardar} />
    </Dialogo>
  )
}

// El título del diálogo es el del primer paso; el segundo paso lo explica con su propio encabezado.
function Pasos({ alGuardar }: Pick<Props, 'alGuardar'>) {
  const [emocion, setEmocion] = useState<Emocion | null>(null)

  if (emocion === null) return <PanelEmociones onElegir={setEmocion} />

  return (
    <div className={estilos.escribir}>
      <div className={estilos.cabecera}>
        <span className={estilos.emocion} data-emocion={emocion}>
          <IconoEmocion emocion={emocion} />
          <span>{ETIQUETAS[emocion]}</span>
        </span>
        <Boton variante="suave" onClick={() => setEmocion(null)}>
          Cambiar emoción
        </Boton>
      </div>
      <p className={estilos.ayuda}>Escribe libremente. Este es tu espacio seguro y cada palabra riega tu espacio verde.</p>
      <HojaDePapel emocion={emocion} onGuardado={alGuardar} />
    </div>
  )
}
