import { useEffect, useId, useState, type FormEvent } from 'react'
import { Aviso } from '../../shared/ui/Aviso.tsx'
import { Boton } from '../../shared/ui/Boton.tsx'
import { Icono } from '../../shared/ui/Icono.tsx'
import { DetalleSugerencia } from './DetalleSugerencia.tsx'
import { codigoCorto } from './formato.ts'
import estilos from './PanelSugerencias.module.css'
import { Paginacion } from './Paginacion.tsx'
import { TablaSugerencias } from './TablaSugerencias.tsx'
import { TarjetasResumen } from './TarjetasResumen.tsx'
import {
  ESTADOS_SUGERENCIA,
  ETIQUETA_ESTADO_SUGERENCIA,
  ETIQUETA_ORDEN,
  type CambiosDeSugerencia,
  type ConsultaSugerencias,
  type EstadoSugerencia,
  type FuenteDeSugerencias,
  type OrdenSugerencias,
  type PaginaDeSugerencias,
  type ResumenSugerencias,
  type Sugerencia,
} from './tipos.ts'

interface Props {
  fuente: FuenteDeSugerencias
  /** Apodo de la persona de staff que tiene la sesión abierta. */
  apodo: string
  onSalir: () => void
  /** Solo para administradores (HU-12). Si no se entrega, el botón no aparece. */
  onAdministracion?: () => void
}

const TAMANO_PAGINA = 10
const CONSULTA_INICIAL: ConsultaSugerencias = { orden: 'recientes', limite: TAMANO_PAGINA, desplazamiento: 0 }

/**
 * HU-11: bandeja de sugerencias para el staff. Los filtros y la paginación los resuelve el servidor, porque habrá
 * más de mil sugerencias. Este panel nunca recibe ni muestra el texto de un desahogo.
 * La seguridad (que solo entre staff o admin) es del backend en cada petición (HU-10): esta pantalla no la reemplaza.
 * Lo que la API aún no ofrece (el resumen con cifras) no se muestra.
 */
export function PanelSugerencias({ fuente, apodo, onSalir, onAdministracion }: Props) {
  const idUsuario = useId()
  const [escritoUsuario, setEscritoUsuario] = useState('')
  const [consulta, setConsulta] = useState<ConsultaSugerencias>(CONSULTA_INICIAL)
  const [datos, setDatos] = useState<PaginaDeSugerencias | null>(null)
  const [resumen, setResumen] = useState<ResumenSugerencias | null>(null)
  // La carga se identifica por la consulta y una "versión" que sube cuando hay que volver a pedir lo mismo
  // (después de cambiar un estado o de pulsar Reintentar). Así "cargando" y "falló" se derivan y no se guardan.
  const [version, setVersion] = useState(0)
  const [respondido, setRespondido] = useState<{ consulta: ConsultaSugerencias; version: number } | null>(null)
  const [fallo, setFallo] = useState<{ consulta: ConsultaSugerencias; version: number } | null>(null)
  const [aviso, setAviso] = useState('')
  const [falloAlCambiar, setFalloAlCambiar] = useState(false)
  const [abierta, setAbierta] = useState<Sugerencia | null>(null)

  useEffect(() => {
    let vigente = true
    fuente
      .consultar(consulta)
      .then((pagina) => {
        if (!vigente) return
        setDatos(pagina)
        setFallo(null)
        setRespondido({ consulta, version })
      })
      .catch(() => {
        if (!vigente) return
        setFallo({ consulta, version })
        setRespondido({ consulta, version })
      })
    return () => {
      vigente = false
    }
  }, [fuente, consulta, version])

  useEffect(() => {
    if (!fuente.resumen) return
    let vigente = true
    fuente
      .resumen()
      .then((cifras) => vigente && setResumen(cifras))
      .catch(() => vigente && setResumen(null))
    return () => {
      vigente = false
    }
  }, [fuente, version])

  const cargando = respondido?.consulta !== consulta || respondido.version !== version
  const falloAlCargar = fallo?.consulta === consulta && fallo.version === version

  const filtrar = (cambios: Partial<ConsultaSugerencias>) => setConsulta((previa) => ({ ...previa, ...cambios, desplazamiento: 0 }))

  function buscarUsuario(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    filtrar({ usuario: escritoUsuario.trim() || undefined })
  }

  const actualizar = fuente.actualizar

  async function aplicar(id: string, cambios: CambiosDeSugerencia) {
    const resultado = await actualizar?.(id, cambios)
    setVersion((actual) => actual + 1)
    return resultado
  }

  async function cambiarEstado(sugerencia: Sugerencia, estado: EstadoSugerencia) {
    setFalloAlCambiar(false)
    setAviso('')
    try {
      const resultado = await aplicar(sugerencia.id, { estado })
      const codigo = codigoCorto(sugerencia.id)
      const nombre = ETIQUETA_ESTADO_SUGERENCIA[estado].toLowerCase()
      setAviso(resultado?.huboCambios === false ? `La sugerencia ${codigo} ya estaba ${nombre}: no se guardó nada.` : `La sugerencia ${codigo} ahora está ${nombre}.`)
    } catch {
      setFalloAlCambiar(true)
    }
  }

  async function guardarDetalle(id: string, cambios: CambiosDeSugerencia) {
    const resultado = await aplicar(id, cambios)
    setAbierta(null)
    const codigo = codigoCorto(id)
    setAviso(resultado?.huboCambios === false ? `No había nada nuevo que guardar en la sugerencia ${codigo}.` : `Guardamos los cambios de la sugerencia ${codigo}.`)
  }

  const items = datos?.items ?? []

  return (
    <div className={estilos.pagina}>
      <header className={estilos.encabezado}>
        <div className={estilos.interior}>
          <div className={estilos.marca}>
            <span className={estilos.logo}>
              <Icono nombre="hoja" tamano={22} />
            </span>
            <span className={estilos.nombre}>Treeve</span>
            <span className={estilos.pildora}>
              <Icono nombre="escudo" tamano={16} />
              Panel de Staff y Soporte
            </span>
          </div>
          <div className={estilos.sesion}>
            <span>
              Staff: <strong>{apodo}</strong>
            </span>
            {onAdministracion && (
              <Boton variante="suave" onClick={onAdministracion} className={estilos.administracion}>
                <Icono nombre="panel" tamano={18} />
                Panel de Administración
              </Boton>
            )}
            <button type="button" className={estilos.cerrarSesion} onClick={onSalir}>
              <Icono nombre="salir" tamano={18} />
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className={estilos.principal}>
        <h1 className={estilos.titulo}>Gestión de sugerencias</h1>
        <p className={estilos.subtitulo}>Revisa y responde a las ideas de la comunidad Treeve.</p>

        {fuente.resumen && <TarjetasResumen resumen={resumen} />}

        <section aria-labelledby={`${idUsuario}-titulo`} className={estilos.bandeja}>
          <h2 id={`${idUsuario}-titulo`} className={estilos.tituloBandeja}>
            Bandeja de sugerencias
          </h2>

          <div className={estilos.filtros}>
            <form onSubmit={buscarUsuario} className={estilos.busqueda}>
              <Icono nombre="buscar" tamano={20} />
              <label htmlFor={idUsuario} className={estilos.soloLectores}>
                Buscar por nombre de usuario
              </label>
              <input id={idUsuario} type="search" value={escritoUsuario} placeholder="Nombre de usuario exacto…" onChange={(e) => setEscritoUsuario(e.target.value)} />
              <Boton type="submit" variante="suave">
                Buscar
              </Boton>
            </form>
            <label className={estilos.filtro}>
              <span className={estilos.soloLectores}>Estado</span>
              <select value={consulta.estado ?? 'todos'} onChange={(e) => filtrar({ estado: e.target.value === 'todos' ? undefined : (e.target.value as EstadoSugerencia) })}>
                <option value="todos">Todos los estados</option>
                {ESTADOS_SUGERENCIA.map((estado) => (
                  <option key={estado} value={estado}>
                    {ETIQUETA_ESTADO_SUGERENCIA[estado]}
                  </option>
                ))}
              </select>
            </label>
            <label className={estilos.filtro}>
              <span className={estilos.etiquetaFecha}>Desde</span>
              <input type="date" value={consulta.desde ?? ''} max={consulta.hasta} onChange={(e) => filtrar({ desde: e.target.value || undefined })} />
            </label>
            <label className={estilos.filtro}>
              <span className={estilos.etiquetaFecha}>Hasta</span>
              <input type="date" value={consulta.hasta ?? ''} min={consulta.desde} onChange={(e) => filtrar({ hasta: e.target.value || undefined })} />
            </label>
            <label className={estilos.filtro}>
              <span className={estilos.soloLectores}>Orden</span>
              <select value={consulta.orden ?? 'recientes'} onChange={(e) => filtrar({ orden: e.target.value as OrdenSugerencias })}>
                {(Object.keys(ETIQUETA_ORDEN) as OrdenSugerencias[]).map((orden) => (
                  <option key={orden} value={orden}>
                    {ETIQUETA_ORDEN[orden]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <output className={estilos.aviso}>{aviso}</output>
          {falloAlCambiar && <Aviso>No pudimos cambiar el estado. Inténtalo de nuevo en un momento.</Aviso>}
          {falloAlCargar && (
            <div className={estilos.reintento}>
              <Aviso>No pudimos cargar las sugerencias. Inténtalo de nuevo en un momento.</Aviso>
              <Boton variante="suave" onClick={() => setVersion((actual) => actual + 1)}>
                Reintentar
              </Boton>
            </div>
          )}

          <TablaSugerencias items={items} ocupado={cargando} onCambiarEstado={actualizar ? (s, estado) => void cambiarEstado(s, estado) : undefined} onVer={setAbierta} />
          <Paginacion
            desplazamiento={consulta.desplazamiento}
            cantidad={items.length}
            hayMas={datos?.hayMas ?? false}
            onAnterior={() => setConsulta((previa) => ({ ...previa, desplazamiento: Math.max(0, previa.desplazamiento - previa.limite) }))}
            onSiguiente={() => setConsulta((previa) => ({ ...previa, desplazamiento: previa.desplazamiento + previa.limite }))}
          />
        </section>
      </main>

      <DetalleSugerencia sugerencia={abierta} onCerrar={() => setAbierta(null)} onGuardar={actualizar ? guardarDetalle : undefined} />
    </div>
  )
}
