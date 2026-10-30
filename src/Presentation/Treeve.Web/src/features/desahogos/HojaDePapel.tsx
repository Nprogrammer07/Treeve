import { useId, useState, type FormEvent } from 'react'
import { Aviso } from '../../shared/ui/Aviso.tsx'
import { Boton } from '../../shared/ui/Boton.tsx'
import { ErrorApi } from '../../shared/api/clienteApi.ts'
import { Icono } from '../../shared/ui/Icono.tsx'
import { guardarDesahogo } from './api.ts'
import estilos from './HojaDePapel.module.css'
import type { Emocion, MensajeDeApoyo } from './tipos.ts'

// Ayuda de UX. Quien decide el límite es el backend (TextoDesahogo.LongitudMaxima).
const LONGITUD_MAXIMA = 2000

interface Props {
  emocion: Emocion
  /** Recibe el mensaje de apoyo que la API devuelve junto con el desahogo guardado. */
  onGuardado: (mensaje: MensajeDeApoyo) => void
}

interface FalloAlGuardar {
  texto: string
  /** Código para reportar el problema sin compartir el desahogo. */
  seguimiento?: string
}

/**
 * Qué decirle a la persona cuando no se pudo guardar. Si el servidor falló DESPUÉS de guardar (error 5xx), el desahogo
 * pudo haber quedado guardado: la API pide no repetir el envío a ciegas, porque crearía una segunda nota.
 */
function explicarFallo(error: unknown): FalloAlGuardar {
  if (error instanceof ErrorApi) {
    if (error.estado >= 500) {
      return {
        texto: 'Algo falló al guardar tu desahogo. Es posible que sí haya quedado guardado: si lo intentas de nuevo, podría guardarse dos veces.',
        seguimiento: error.correlacionId,
      }
    }
    if (error.mensajeParaUsuario) return { texto: error.mensajeParaUsuario }
  }
  return { texto: 'No pudimos guardar tu desahogo. Inténtalo de nuevo en un momento.' }
}

/** HU-05: presentación pura. Valida para la experiencia, pero quien decide es la API. */
export function HojaDePapel({ emocion, onGuardado }: Props) {
  const idTexto = useId()
  const idContador = useId()
  const [texto, setTexto] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [fallo, setFallo] = useState<FalloAlGuardar | null>(null)

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setGuardando(true)
    setFallo(null)
    try {
      const guardado = await guardarDesahogo({ emocion, texto })
      setTexto('')
      onGuardado(guardado.mensajeDeApoyo)
    } catch (error) {
      // Sin console.log: el error viaja junto al texto del desahogo.
      setFallo(explicarFallo(error))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={enviar} className={estilos.formulario}>
      <label htmlFor={idTexto} className={estilos.soloLectores}>
        Escribe lo que sientes
      </label>
      <textarea
        id={idTexto}
        className={estilos.hoja}
        value={texto}
        maxLength={LONGITUD_MAXIMA}
        aria-describedby={idContador}
        placeholder="Hoy me sentí..."
        rows={9}
        onChange={(e) => setTexto(e.target.value)}
      />
      {fallo && (
        <Aviso>
          {fallo.texto}
          {fallo.seguimiento && <span className={estilos.seguimiento}>Código de seguimiento: {fallo.seguimiento}</span>}
        </Aviso>
      )}
      <div className={estilos.pie}>
        <p id={idContador} className={estilos.contador}>
          {texto.length} / {LONGITUD_MAXIMA}
        </p>
        <Boton type="submit" disabled={guardando || texto.trim() === ''} className={estilos.regar}>
          <Icono nombre="gota" tamano={18} />
          Regar mi espacio verde
        </Boton>
      </div>
    </form>
  )
}
