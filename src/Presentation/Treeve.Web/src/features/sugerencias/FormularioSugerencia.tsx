import { useId, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../shared/api/clienteApi.ts'
import { Aviso } from '../../shared/ui/Aviso.tsx'
import { Boton } from '../../shared/ui/Boton.tsx'
import { enviarSugerencia } from './api.ts'
import estilos from './FormularioSugerencia.module.css'
import { LONGITUD_MAXIMA_SUGERENCIA } from './tipos.ts'

interface Props {
  onEnviada: () => void
}

/** HU-09: escribir y enviar una sugerencia. Valida para la experiencia; el backend siempre vuelve a validar. */
export function FormularioSugerencia({ onEnviada }: Props) {
  const idTexto = useId()
  const idContador = useId()
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setEnviando(true)
    setFallo(null)
    try {
      await enviarSugerencia({ texto })
      setTexto('')
      onEnviada()
    } catch (error) {
      setFallo(error instanceof ErrorApi && error.mensajeParaUsuario ? error.mensajeParaUsuario : 'No pudimos enviar tu sugerencia. Inténtalo de nuevo en un momento.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className={estilos.formulario}>
      <p className={estilos.ayuda}>Cuéntanos qué haría Treeve más acogedor. La verá el equipo, junto con tu nombre de usuario.</p>
      <label htmlFor={idTexto} className={estilos.soloLectores}>
        Escribe tu sugerencia
      </label>
      <textarea
        id={idTexto}
        className={estilos.texto}
        value={texto}
        maxLength={LONGITUD_MAXIMA_SUGERENCIA}
        aria-describedby={idContador}
        placeholder="Me gustaría que Treeve..."
        rows={6}
        onChange={(e) => setTexto(e.target.value)}
      />
      {fallo && <Aviso>{fallo}</Aviso>}
      <div className={estilos.pie}>
        <p id={idContador} className={estilos.contador}>
          {texto.length} / {LONGITUD_MAXIMA_SUGERENCIA}
        </p>
        <Boton type="submit" disabled={enviando || texto.trim() === ''}>
          Enviar sugerencia
        </Boton>
      </div>
    </form>
  )
}
