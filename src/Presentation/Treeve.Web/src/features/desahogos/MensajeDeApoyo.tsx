import { useEffect, useRef, useState } from 'react'
import { Boton } from '../../shared/ui/Boton.tsx'
import { DURACION_DE_PAUSA, intervaloParaTexto, prefiereReducirMovimiento } from './animacion.ts'
import estilos from './MensajeDeApoyo.module.css'
import type { MensajeDeApoyo as Mensaje } from './tipos.ts'

interface Props {
  mensaje: Mensaje
  onSeguir: () => void
  /**
   * Se llama una sola vez, justo al aparecer el mensaje. Lo usa EspacioDeLaPersona para disparar la animación de
   * riego de la escena (HU-07b): así la pausa y la escritura letra por letra ocurren mientras el espacio verde
   * ya se está regando por detrás, sincronizadas con ese momento.
   */
  onAparece?: () => void
}

type Fase = 'pausa' | 'escribiendo' | 'terminado'

/**
 * HU-06 y HU-06a-4: el mensaje que la API devuelve al guardar un desahogo, en letra manuscrita.
 * El frontend no lo arma ni decide si es de crisis (ADR-001 es del backend): solo lo pinta y lo anima.
 *
 * La animación va: una pausa breve ("El bosque te está escuchando…") y después el texto escribiéndose
 * letra por letra. La persona puede saltar en cualquier momento con "Saltar"; "Seguir" aparece solo cuando
 * el mensaje ya está completo. La X y Esc del diálogo siempre cierran, animación o no.
 *
 * El mensaje aparece de inmediato (sin pausa ni escritura) en dos casos:
 *  - Si la persona pidió reducir el movimiento al sistema.
 *  - Si el mensaje es de crisis: la línea de ayuda no debe esperar.
 *
 * Accesibilidad: el lector de pantalla recibe el texto completo UNA sola vez, no por cada letra. La
 * animación visual va aparte, oculta para él (aria-hidden).
 */
export function MensajeDeApoyo({ mensaje, onSeguir, onAparece }: Props) {
  const tarjeta = useRef<HTMLDivElement>(null)
  // Si el mensaje aparece completo de inmediato (crisis o reducir movimiento), no hay animación.
  const sinAnimacion = mensaje.esDeCrisis || prefiereReducirMovimiento()
  const [enPausa, setEnPausa] = useState(() => !sinAnimacion)
  const [letrasVisibles, setLetrasVisibles] = useState(() => (sinAnimacion ? mensaje.texto.length : 0))
  const intervalo = intervaloParaTexto(mensaje.texto)
  // La fase se deriva del estado real: pausa si todavía estamos esperando; terminado si ya se escribió
  // todo (o si no había animación); si no, se está escribiendo.
  const fase: Fase = enPausa ? 'pausa' : letrasVisibles >= mensaje.texto.length ? 'terminado' : 'escribiendo'

  // El foco pasa al mensaje para que un lector de pantalla lo lea, y se avisa que ya se mostró
  // (para que la escena se riegue a la par de la pausa + escritura). Un useRef evita que StrictMode
  // dispare la aparición dos veces por el doble montaje de los efectos en desarrollo.
  const yaAparecio = useRef(false)
  useEffect(() => {
    if (yaAparecio.current) return
    yaAparecio.current = true
    tarjeta.current?.focus()
    onAparece?.()
  }, [onAparece])

  // Pausa inicial: espera y sale de ella.
  useEffect(() => {
    if (!enPausa) return undefined
    const t = window.setTimeout(() => setEnPausa(false), DURACION_DE_PAUSA)
    return () => window.clearTimeout(t)
  }, [enPausa])

  // Escritura letra por letra: avanza con un cronómetro hasta cubrir todo el texto.
  useEffect(() => {
    if (enPausa || letrasVisibles >= mensaje.texto.length) return undefined
    const t = window.setTimeout(() => setLetrasVisibles((n) => n + 1), intervalo)
    return () => window.clearTimeout(t)
  }, [enPausa, letrasVisibles, mensaje.texto.length, intervalo])

  const saltar = () => {
    setEnPausa(false)
    setLetrasVisibles(mensaje.texto.length)
  }

  const textoVisible = mensaje.texto.slice(0, letrasVisibles)

  return (
    <div className={estilos.mensaje}>
      <div ref={tarjeta} tabIndex={-1} className={estilos.tarjeta} data-crisis={mensaje.esDeCrisis}>
        {/* El mensaje completo, invisible pero disponible para el lector de pantalla, que lo lee UNA sola vez
            al pasar el foco a la tarjeta. No tiene aria-live: el texto no cambia, no hay por qué reanunciar. */}
        <p className={estilos.soloLectores}>{mensaje.texto}</p>
        {/* La animación visual: oculta para el lector de pantalla para que no la narre letra por letra. */}
        <div aria-hidden="true">
          {fase === 'pausa' ? (
            <p className={`${estilos.texto} ${estilos.pausa}`}>El bosque te está escuchando…</p>
          ) : (
            <p className={estilos.texto}>
              {textoVisible}
              {fase === 'escribiendo' && <span className={estilos.cursor} />}
            </p>
          )}
        </div>
      </div>
      {fase === 'terminado' ? (
        <Boton onClick={onSeguir}>Seguir</Boton>
      ) : (
        <Boton variante="suave" onClick={saltar}>
          Saltar
        </Boton>
      )}
    </div>
  )
}
