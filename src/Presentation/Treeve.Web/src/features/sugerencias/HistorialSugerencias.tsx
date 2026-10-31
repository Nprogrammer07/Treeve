import { useEffect, useState } from 'react'
import { formatearFecha } from '../../shared/formato.ts'
import { Aviso } from '../../shared/ui/Aviso.tsx'
import { Boton } from '../../shared/ui/Boton.tsx'
import { EtiquetaEstadoSugerencia } from '../../shared/ui/EtiquetaEstadoSugerencia.tsx'
import { listarMisSugerencias } from './api.ts'
import estilos from './HistorialSugerencias.module.css'
import type { SugerenciaPropia } from './tipos.ts'

/** HU-09: las sugerencias de la persona, con el estado de cada una. La API solo devuelve las suyas. */
export function HistorialSugerencias() {
  // Cada intento tiene su número; "cargando" y "falló" se derivan de si la respuesta es la de este intento.
  const [intento, setIntento] = useState(0)
  const [respuesta, setRespuesta] = useState<{ intento: number; lista: SugerenciaPropia[] | null } | null>(null)

  useEffect(() => {
    let vigente = true
    listarMisSugerencias()
      .then((lista) => vigente && setRespuesta({ intento, lista }))
      .catch(() => vigente && setRespuesta({ intento, lista: null }))
    return () => {
      vigente = false
    }
  }, [intento])

  if (respuesta === null || respuesta.intento !== intento) {
    return <output>Cargando tus sugerencias…</output>
  }

  if (respuesta.lista === null) {
    return (
      <div className={estilos.reintento}>
        <Aviso>No pudimos cargar tus sugerencias. Inténtalo de nuevo en un momento.</Aviso>
        <Boton variante="suave" onClick={() => setIntento((actual) => actual + 1)}>
          Reintentar
        </Boton>
      </div>
    )
  }

  if (respuesta.lista.length === 0) {
    return <p className={estilos.vacio}>Todavía no has enviado sugerencias.</p>
  }

  return (
    <ul className={estilos.lista}>
      {respuesta.lista.map((sugerencia) => (
        <li key={sugerencia.sugerenciaId} className={estilos.elemento}>
          <p className={estilos.texto}>{sugerencia.texto}</p>
          <div className={estilos.meta}>
            <span className={estilos.fecha}>{formatearFecha(sugerencia.creadaEn)}</span>
            <EtiquetaEstadoSugerencia estado={sugerencia.estado} />
          </div>
          {/* HU-11: la respuesta del equipo. Se muestra tal cual y sin decir quién del equipo la escribió. */}
          {sugerencia.comentario && (
            <div className={estilos.respuesta}>
              <p className={estilos.tituloRespuesta}>Respuesta del equipo</p>
              <p className={estilos.textoRespuesta}>{sugerencia.comentario}</p>
              {sugerencia.respondidaEn && <p className={estilos.fecha}>{formatearFecha(sugerencia.respondidaEn)}</p>}
            </div>
          )}
          {!sugerencia.comentario && sugerencia.respondidaEn && <p className={estilos.fecha}>El equipo actualizó el estado el {formatearFecha(sugerencia.respondidaEn)}.</p>}
        </li>
      ))}
    </ul>
  )
}
