import { useEffect, useRef, useState } from 'react'
import { Boton } from '../../shared/ui/Boton.tsx'
import { DURACION_DE_PAUSA, INTERVALO_POR_LETRA, prefiereReducirMovimiento } from './animacion.ts'
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
 * Si la persona pidió reducir el movimiento al sistema, no hay pausa ni escritura: aparece completo.
 */
export function MensajeDeApoyo({ mensaje, onSeguir, onAparece }: Props) {
  const tarjeta = useRef<HTMLDivElement>(null)
  const [fase, setFase] = useState<Fase>(() => (prefiereReducirMovimiento() ? 'terminado' : 'pausa'))
  const [letrasVisibles, setLetrasVisibles] = useState(() => (prefiereReducirMovimiento() ? mensaje.texto.length : 0))

  // El foco pasa al mensaje (ya sea a la pausa o al texto) para que un lector de pantalla lo lea de inmediato.
  // Y se avisa que ya se mostró, para que la escena se riegue a la par de la pausa + escritura.
  useEffect(() => {
    tarjeta.current?.focus()
    onAparece?.()
    // onAparece corre una sola vez por mensaje: no entra en el arreglo de dependencias a propósito,
    // para que un padre que lo redefina no vuelva a regar la escena.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pausa inicial: espera y pasa a escribir.
  useEffect(() => {
    if (fase !== 'pausa') return undefined
    const t = window.setTimeout(() => setFase('escribiendo'), DURACION_DE_PAUSA)
    return () => window.clearTimeout(t)
  }, [fase])

  // Escritura letra por letra: avanza con un cronómetro hasta cubrir todo el texto.
  useEffect(() => {
    if (fase !== 'escribiendo') return undefined
    if (letrasVisibles >= mensaje.texto.length) {
      setFase('terminado')
      return undefined
    }
    const t = window.setTimeout(() => setLetrasVisibles((n) => n + 1), INTERVALO_POR_LETRA)
    return () => window.clearTimeout(t)
  }, [fase, letrasVisibles, mensaje.texto.length])

  const saltar = () => {
    setLetrasVisibles(mensaje.texto.length)
    setFase('terminado')
  }

  const textoVisible = mensaje.texto.slice(0, letrasVisibles)

  return (
    <div className={estilos.mensaje}>
      <div ref={tarjeta} tabIndex={-1} className={estilos.tarjeta} data-crisis={mensaje.esDeCrisis}>
        {/* El contenido del mensaje se anuncia como una región "educada": el lector no interrumpe. */}
        <div aria-live="polite" aria-atomic="true">
          {fase === 'pausa' ? (
            <p className={`${estilos.texto} ${estilos.pausa}`}>El bosque te está escuchando…</p>
          ) : (
            <p className={estilos.texto}>
              {textoVisible}
              {fase === 'escribiendo' && <span aria-hidden="true" className={estilos.cursor} />}
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
