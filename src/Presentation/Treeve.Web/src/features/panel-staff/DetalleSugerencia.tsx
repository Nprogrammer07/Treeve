import { useId, useState, type FormEvent } from 'react'
import { Aviso } from '../../shared/ui/Aviso.tsx'
import { Boton } from '../../shared/ui/Boton.tsx'
import { Dialogo } from '../../shared/ui/Dialogo.tsx'
import { formatearFecha } from './formato.ts'
import estilos from './PanelSugerencias.module.css'
import { ESTADOS, ETIQUETA_ESTADO, type CambiosDeSugerencia, type EstadoSugerencia, type Sugerencia } from './tipos.ts'

interface Props {
  /** La sugerencia abierta, o null si la ventana está cerrada. */
  sugerencia: Sugerencia | null
  onCerrar: () => void
  onGuardar: (id: string, cambios: CambiosDeSugerencia) => Promise<void>
}

/** HU-11: ver la sugerencia completa, cambiar su estado y dejar un comentario que verá quien la envió. */
export function DetalleSugerencia({ sugerencia, onCerrar, onGuardar }: Props) {
  return (
    <Dialogo
      abierto={sugerencia !== null}
      titulo={sugerencia ? `Sugerencia #${sugerencia.id}` : ''}
      descripcion={sugerencia ? `De ${sugerencia.usuario} · ${formatearFecha(sugerencia.fecha)}` : undefined}
      onCerrar={onCerrar}
    >
      {sugerencia && <Formulario key={sugerencia.id} sugerencia={sugerencia} onGuardar={onGuardar} />}
    </Dialogo>
  )
}

function Formulario({ sugerencia, onGuardar }: { sugerencia: Sugerencia; onGuardar: Props['onGuardar'] }) {
  const idEstado = useId()
  const idComentario = useId()
  const [estado, setEstado] = useState<EstadoSugerencia>(sugerencia.estado)
  const [comentario, setComentario] = useState(sugerencia.comentario ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(false)

  const cambios: CambiosDeSugerencia = {
    ...(estado !== sugerencia.estado && { estado }),
    ...(comentario.trim() !== (sugerencia.comentario ?? '') && { comentario: comentario.trim() }),
  }
  const huboCambios = Object.keys(cambios).length > 0

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setGuardando(true)
    setError(false)
    try {
      await onGuardar(sugerencia.id, cambios)
    } catch {
      setError(true)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={enviar} className={estilos.detalle}>
      <blockquote className={estilos.textoCompleto}>{sugerencia.texto}</blockquote>
      <div className={estilos.campo}>
        <label htmlFor={idEstado}>Estado</label>
        <select id={idEstado} className={estilos.selector} value={estado} onChange={(e) => setEstado(e.target.value as EstadoSugerencia)}>
          {ESTADOS.map((valor) => (
            <option key={valor} value={valor}>
              {ETIQUETA_ESTADO[valor]}
            </option>
          ))}
        </select>
      </div>
      <div className={estilos.campo}>
        <label htmlFor={idComentario}>Comentario para quien sugirió</label>
        <textarea id={idComentario} className={estilos.comentario} rows={4} value={comentario} aria-describedby={`${idComentario}-ayuda`} onChange={(e) => setComentario(e.target.value)} />
        <p id={`${idComentario}-ayuda`} className={estilos.ayuda}>
          La persona verá este comentario.
        </p>
      </div>
      {error && <Aviso>No pudimos guardar los cambios. Inténtalo de nuevo en un momento.</Aviso>}
      <Boton type="submit" disabled={!huboCambios || guardando}>
        Guardar cambios
      </Boton>
    </form>
  )
}
