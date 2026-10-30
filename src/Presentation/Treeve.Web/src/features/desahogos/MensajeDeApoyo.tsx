import { useEffect, useRef } from 'react'
import { Boton } from '../../shared/ui/Boton.tsx'
import estilos from './MensajeDeApoyo.module.css'
import type { MensajeDeApoyo as Mensaje } from './tipos.ts'

interface Props {
  mensaje: Mensaje
  onSeguir: () => void
}

/**
 * HU-06: el mensaje que la API devuelve al guardar un desahogo. Se muestra tal cual, en letra manuscrita.
 * El frontend no lo arma ni decide si es de crisis (ADR-001 es del backend): solo lo pinta.
 * Si es de crisis, el propio texto sugiere una línea de atención; la interfaz no agrega teléfonos ni redirige nada.
 * La persona puede cerrarlo cuando quiera. Nunca se cierra solo.
 */
export function MensajeDeApoyo({ mensaje, onSeguir }: Props) {
  const tarjeta = useRef<HTMLDivElement>(null)

  // El foco pasa al mensaje para que un lector de pantalla lo lea de inmediato.
  useEffect(() => {
    tarjeta.current?.focus()
  }, [])

  return (
    <div className={estilos.mensaje}>
      <div ref={tarjeta} tabIndex={-1} className={estilos.tarjeta} data-crisis={mensaje.esDeCrisis}>
        <p className={estilos.texto}>{mensaje.texto}</p>
      </div>
      <Boton onClick={onSeguir}>Seguir</Boton>
    </div>
  )
}
