import { useId, useState, type FormEvent } from 'react'
import { formatearFecha } from '../../shared/formato.ts'
import { Aviso } from '../../shared/ui/Aviso.tsx'
import { Boton } from '../../shared/ui/Boton.tsx'
import { Dialogo } from '../../shared/ui/Dialogo.tsx'
import { EtiquetaEstadoSugerencia } from '../../shared/ui/EtiquetaEstadoSugerencia.tsx'
import { codigoCorto } from './formato.ts'
import estilos from './PanelSugerencias.module.css'
import { ESTADOS_SUGERENCIA, ETIQUETA_ESTADO_SUGERENCIA, LONGITUD_MAXIMA_COMENTARIO, type CambiosDeSugerencia, type EstadoSugerencia, type Sugerencia } from './tipos.ts'

interface Props {
  /** La sugerencia abierta, o null si la ventana está cerrada. */
  sugerencia: Sugerencia | null
  onCerrar: () => void
  /** Solo si la API permite cambiar el estado y comentar (HU-11). Sin esto, la ventana es de solo lectura. */
  onGuardar?: (id: string, cambios: CambiosDeSugerencia) => Promise<void>
}

/** HU-11: ver la sugerencia completa y, cuando la API lo permita, cambiar su estado y dejar un comentario para quien la envió. */
export function DetalleSugerencia({ sugerencia, onCerrar, onGuardar }: Props) {
  return (
    <Dialogo
      abierto={sugerencia !== null}
      titulo={sugerencia ? `Sugerencia #${codigoCorto(sugerencia.id)}` : ''}
      descripcion={sugerencia ? `De ${sugerencia.usuario} · ${formatearFecha(sugerencia.fecha)}` : undefined}
      onCerrar={onCerrar}
    >
      {sugerencia && (onGuardar ? <Formulario key={sugerencia.id} sugerencia={sugerencia} onGuardar={onGuardar} /> : <SoloLectura sugerencia={sugerencia} />)}
    </Dialogo>
  )
}

function SoloLectura({ sugerencia }: { sugerencia: Sugerencia }) {
  return (
    <div className={estilos.detalle}>
      <blockquote className={estilos.textoCompleto}>{sugerencia.texto}</blockquote>
      <div>
        <EtiquetaEstadoSugerencia estado={sugerencia.estado} />
      </div>
      <p className={estilos.ayuda}>Por ahora solo se pueden consultar: cambiar el estado y dejar comentarios llegará pronto.</p>
    </div>
  )
}

function Formulario({ sugerencia, onGuardar }: { sugerencia: Sugerencia; onGuardar: NonNullable<Props['onGuardar']> }) {
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
      {sugerencia.gestionadaEn && <p className={estilos.ayuda}>Última gestión: {formatearFecha(sugerencia.gestionadaEn)}</p>}
      <div className={estilos.campo}>
        <label htmlFor={idEstado}>Estado</label>
        <select id={idEstado} className={estilos.selector} value={estado} onChange={(e) => setEstado(e.target.value as EstadoSugerencia)}>
          {ESTADOS_SUGERENCIA.map((valor) => (
            <option key={valor} value={valor}>
              {ETIQUETA_ESTADO_SUGERENCIA[valor]}
            </option>
          ))}
        </select>
      </div>
      <div className={estilos.campo}>
        <label htmlFor={idComentario}>Comentario para quien sugirió</label>
        <textarea
          id={idComentario}
          className={estilos.comentario}
          rows={4}
          maxLength={LONGITUD_MAXIMA_COMENTARIO}
          value={comentario}
          aria-describedby={`${idComentario}-ayuda`}
          onChange={(e) => setComentario(e.target.value)}
        />
        <p id={`${idComentario}-ayuda`} className={estilos.ayuda}>
          La persona verá este comentario. {comentario.length} / {LONGITUD_MAXIMA_COMENTARIO}
        </p>
      </div>
      {error && <Aviso>No pudimos guardar los cambios. Inténtalo de nuevo en un momento.</Aviso>}
      <Boton type="submit" disabled={!huboCambios || guardando}>
        Guardar cambios
      </Boton>
    </form>
  )
}
