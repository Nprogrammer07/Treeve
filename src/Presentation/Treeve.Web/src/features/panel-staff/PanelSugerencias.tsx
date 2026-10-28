import { useEffect, useId, useState } from 'react'
import { Aviso } from '../../shared/ui/Aviso.tsx'
import { Boton } from '../../shared/ui/Boton.tsx'
import { Icono } from '../../shared/ui/Icono.tsx'
import { DetalleSugerencia } from './DetalleSugerencia.tsx'
import estilos from './PanelSugerencias.module.css'
import { Paginacion } from './Paginacion.tsx'
import { TablaSugerencias } from './TablaSugerencias.tsx'
import { TarjetasResumen } from './TarjetasResumen.tsx'
import {
  ESTADOS,
  ETIQUETA_ESTADO,
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
  /** Espera antes de buscar mientras se escribe. Se puede poner en 0 en las pruebas. */
  retardoBusquedaMs?: number
}

const TAMANO_PAGINA = 10
const CONSULTA_INICIAL: ConsultaSugerencias = { busqueda: '', estado: 'todos', orden: 'recientes', pagina: 1, tamano: TAMANO_PAGINA }

/**
 * HU-11: bandeja de sugerencias para el staff. Los filtros, el orden y la paginación los resuelve el servidor,
 * porque habrá más de mil sugerencias. Este panel nunca recibe ni muestra el texto de un desahogo.
 * La seguridad (que solo entre staff o admin) es del backend en cada petición (HU-10): esta pantalla no la reemplaza.
 */
export function PanelSugerencias({ fuente, apodo, onSalir, onAdministracion, retardoBusquedaMs = 300 }: Props) {
  const idBusqueda = useId()
  const [escrito, setEscrito] = useState('')
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
    let vigente = true
    fuente
      .resumen()
      .then((cifras) => vigente && setResumen(cifras))
      .catch(() => vigente && setResumen(null))
    return () => {
      vigente = false
    }
  }, [fuente, version])

  useEffect(() => {
    const espera = setTimeout(() => {
      const busqueda = escrito.trim()
      setConsulta((previa) => (previa.busqueda === busqueda ? previa : { ...previa, busqueda, pagina: 1 }))
    }, retardoBusquedaMs)
    return () => clearTimeout(espera)
  }, [escrito, retardoBusquedaMs])

  const cargando = respondido?.consulta !== consulta || respondido.version !== version
  const falloAlCargar = fallo?.consulta === consulta && fallo.version === version

  const filtrar = (cambios: Partial<ConsultaSugerencias>) => setConsulta((previa) => ({ ...previa, ...cambios, pagina: 1 }))

  async function aplicar(id: string, cambios: CambiosDeSugerencia) {
    await fuente.actualizar(id, cambios)
    setVersion((actual) => actual + 1)
  }

  async function cambiarEstado(sugerencia: Sugerencia, estado: EstadoSugerencia) {
    setFalloAlCambiar(false)
    setAviso('')
    try {
      await aplicar(sugerencia.id, { estado })
      setAviso(`La sugerencia ${sugerencia.id} ahora está ${ETIQUETA_ESTADO[estado].toLowerCase()}.`)
    } catch {
      setFalloAlCambiar(true)
    }
  }

  async function guardarDetalle(id: string, cambios: CambiosDeSugerencia) {
    await aplicar(id, cambios)
    setAbierta(null)
    setAviso(`Guardamos los cambios de la sugerencia ${id}.`)
  }

  const items = datos?.items ?? []
  const total = datos?.total ?? 0

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
        <p className={estilos.subtitulo}>Revisa, prioriza y responde a las ideas de la comunidad Treeve.</p>

        <TarjetasResumen resumen={resumen} />

        <section aria-labelledby={`${idBusqueda}-titulo`} className={estilos.bandeja}>
          <h2 id={`${idBusqueda}-titulo`} className={estilos.tituloBandeja}>
            Bandeja de sugerencias
          </h2>

          <div className={estilos.filtros}>
            <label htmlFor={idBusqueda} className={estilos.soloLectores}>
              Buscar por usuario o contenido
            </label>
            <div className={estilos.busqueda}>
              <Icono nombre="buscar" tamano={20} />
              <input id={idBusqueda} type="search" value={escrito} placeholder="Buscar por usuario o contenido..." onChange={(e) => setEscrito(e.target.value)} />
            </div>
            <label className={estilos.filtro}>
              <span className={estilos.soloLectores}>Estado</span>
              <select value={consulta.estado} onChange={(e) => filtrar({ estado: e.target.value as EstadoSugerencia | 'todos' })}>
                <option value="todos">Todos los estados</option>
                {ESTADOS.map((estado) => (
                  <option key={estado} value={estado}>
                    {ETIQUETA_ESTADO[estado]}
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
              <select value={consulta.orden} onChange={(e) => filtrar({ orden: e.target.value as OrdenSugerencias })}>
                <option value="recientes">Más recientes primero</option>
                <option value="antiguas">Más antiguas primero</option>
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

          <TablaSugerencias items={items} ocupado={cargando} onCambiarEstado={(s, estado) => void cambiarEstado(s, estado)} onVer={setAbierta} />
          <Paginacion pagina={consulta.pagina} tamano={consulta.tamano} total={total} onIrA={(pagina) => setConsulta((previa) => ({ ...previa, pagina }))} />
        </section>
      </main>

      <DetalleSugerencia sugerencia={abierta} onCerrar={() => setAbierta(null)} onGuardar={guardarDetalle} />
    </div>
  )
}
