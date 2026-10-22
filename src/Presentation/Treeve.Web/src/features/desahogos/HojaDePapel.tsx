import { useId, useState, type FormEvent } from 'react'
import { Aviso } from '../../shared/ui/Aviso.tsx'
import { Boton } from '../../shared/ui/Boton.tsx'
import { Icono } from '../../shared/ui/Icono.tsx'
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
      {error && <Aviso>No pudimos guardar tu desahogo. Inténtalo de nuevo en un momento.</Aviso>}
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
