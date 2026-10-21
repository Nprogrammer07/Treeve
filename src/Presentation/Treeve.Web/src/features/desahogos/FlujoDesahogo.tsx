import { useState } from 'react'
import { Boton } from '../../shared/ui/Boton.tsx'
import { ETIQUETAS } from './etiquetas.ts'
import estilos from './FlujoDesahogo.module.css'
import { HojaDePapel } from './HojaDePapel.tsx'
import { IconoEmocion } from './IconoEmocion.tsx'
import { PanelEmociones } from './PanelEmociones.tsx'
import type { Emocion } from './tipos.ts'

type Paso = { nombre: 'emocion' } | { nombre: 'hoja'; emocion: Emocion } | { nombre: 'guardado' }

interface Props {
  /** Si se entrega, se llama al guardar y el flujo no muestra su propia confirmación: app/ decide qué sigue. */
  alGuardar?: () => void
}

/**
 * Orquesta HU-04 → HU-05. El mensaje de apoyo (HU-06) y el riego del árbol (HU-07b)
 * se conectarán aquí cuando se defina su contrato con la API.
 * Solo la emoción elegida vive en memoria; el texto lo gestiona HojaDePapel y nunca se persiste.
 */
export function FlujoDesahogo({ alGuardar }: Props) {
  const [paso, setPaso] = useState<Paso>({ nombre: 'emocion' })

  if (paso.nombre === 'emocion') {
    return <PanelEmociones onContinuar={(emocion) => setPaso({ nombre: 'hoja', emocion })} />
  }

  if (paso.nombre === 'hoja') {
    return (
      <div className={estilos.hoja}>
        <div className={estilos.cabecera}>
          <span className={estilos.emocion}>
            <IconoEmocion emocion={paso.emocion} />
            <span>{ETIQUETAS[paso.emocion]}</span>
          </span>
          <Boton variante="suave" onClick={() => setPaso({ nombre: 'emocion' })}>
            Cambiar emoción
          </Boton>
        </div>
        <HojaDePapel emocion={paso.emocion} onGuardado={() => (alGuardar ? alGuardar() : setPaso({ nombre: 'guardado' }))} />
      </div>
    )
  }

  return (
    <div className={estilos.guardado}>
      <output className={estilos.aviso}>
        Tu desahogo quedó guardado.
      </output>
      <Boton onClick={() => setPaso({ nombre: 'emocion' })}>Escribir otro</Boton>
    </div>
  )
}
