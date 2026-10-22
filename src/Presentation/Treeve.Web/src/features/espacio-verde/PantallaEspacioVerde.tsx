import { useEffect, useRef } from 'react'
import { EspacioVerde, type ControlEspacioVerde, type EtapaArbol } from '../../scene/EspacioVerde.tsx'
import { Boton } from '../../shared/ui/Boton.tsx'
import estilos from './PantallaEspacioVerde.module.css'

interface Props {
  /** La etapa la calcula el backend (HU-07a); esta pantalla solo la dibuja. */
  etapa: EtapaArbol
  /** Riega el espacio verde al entrar: es lo que ocurre justo después de guardar un desahogo. */
  regarAlEntrar?: boolean
  onEscribirOtro: () => void
  mostrarMetricas?: boolean
}

/** HU-07b: pantalla del espacio verde con la animación de riego. El mensaje de apoyo (HU-06) se sumará aquí. */
export function PantallaEspacioVerde({ etapa, regarAlEntrar = false, onEscribirOtro, mostrarMetricas = false }: Props) {
  const escena = useRef<ControlEspacioVerde>(null)

  useEffect(() => {
    if (regarAlEntrar) escena.current?.regar()
  }, [regarAlEntrar])

  return (
    <div className={estilos.pantalla}>
      <h1 className={estilos.titulo}>Tu espacio verde</h1>
      <EspacioVerde etapa={etapa} pajaros ref={escena} mostrarMetricas={mostrarMetricas} />
      {/* La escena es un dibujo: este aviso es la versión en texto del riego. */}
      <output className={estilos.aviso}>{regarAlEntrar ? 'Tu desahogo regó tu espacio verde.' : ''}</output>
      <Boton onClick={onEscribirOtro}>Escribir otro desahogo</Boton>
    </div>
  )
}
