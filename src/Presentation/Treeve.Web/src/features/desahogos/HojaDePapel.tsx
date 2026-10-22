import { useId, useState, type FormEvent } from 'react'
import { Aviso } from '../../shared/ui/Aviso.tsx'
import { Boton } from '../../shared/ui/Boton.tsx'
import { guardarDesahogo } from './api.ts'
import estilos from './HojaDePapel.module.css'
import type { Emocion } from './tipos.ts'

// Ayuda de UX. Quien decide el límite es el backend (TextoDesahogo.LongitudMaxima).
const LONGITUD_MAXIMA = 2000

interface Props {
  emocion: Emocion
  onGuardado: () => void
}

/** HU-05: presentación pura. Valida para la experiencia, pero quien decide es la API. */
export function HojaDePapel({ emocion, onGuardado }: Props) {
  const idTexto = useId()
  const idContador = useId()
  const [texto, setTexto] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(false)

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setGuardando(true)
    setError(false)
    try {
      await guardarDesahogo({ emocion, texto })
      setTexto('')
      onGuardado()
    } catch {
      // Sin console.log: el error viaja junto al texto del desahogo.
      setError(true)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={enviar} className={estilos.formulario}>
      <label htmlFor={idTexto} className={estilos.etiqueta}>
        Escribe lo que sientes
      </label>
      <textarea
        id={idTexto}
        className={estilos.hoja}
        value={texto}
        maxLength={LONGITUD_MAXIMA}
        aria-describedby={idContador}
        rows={10}
        onChange={(e) => setTexto(e.target.value)}
      />
      <p id={idContador} className={estilos.contador}>
        {texto.length} / {LONGITUD_MAXIMA}
      </p>
      {error && <Aviso>No pudimos guardar tu desahogo. Inténtalo de nuevo en un momento.</Aviso>}
      <Boton type="submit" disabled={guardando || texto.trim() === ''}>
        Guardar
      </Boton>
    </form>
  )
}
