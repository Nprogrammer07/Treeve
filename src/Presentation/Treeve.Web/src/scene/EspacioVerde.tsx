import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import estilos from './EspacioVerde.module.css'
import type { Escena, Metricas } from './escena.ts'
import type { EtapaArbol } from './geometria.ts'

export type { EtapaArbol } from './geometria.ts'

export interface ControlEspacioVerde {
  regar: () => void
}

interface Props {
  etapa: EtapaArbol
  pajaros?: boolean
  /** Solo para el spike de rendimiento (RNF-07): muestra FPS y tiempo de carga. */
  mostrarMetricas?: boolean
  ref?: Ref<ControlEspacioVerde>
}

const DESCRIPCION: Record<EtapaArbol, string> = {
  semilla: 'una semilla recién plantada',
  brote: 'un brote pequeño',
  tallo: 'un tallo joven con sus primeras hojas',
  arbol: 'un árbol crecido y frondoso',
}

/**
 * API pública de la escena 2.5D. Las features la usan sin conocer PixiJS.
 * PixiJS se descarga aparte (import dinámico) y solo cuando la escena está cerca de verse,
 * para no frenar la carga inicial de la página.
 */
export function EspacioVerde({ etapa, pajaros = false, mostrarMetricas = false, ref }: Props) {
  const anfitrion = useRef<HTMLDivElement>(null)
  const escena = useRef<Escena | null>(null)
  const riegoPendiente = useRef(false)
  const inicial = useRef({ etapa, pajaros })
  const [metricas, setMetricas] = useState<Metricas | null>(null)

  useImperativeHandle(
    ref,
    () => ({
      regar: () => {
        // Si PixiJS todavía se está descargando, el riego queda pendiente y ocurre al estar lista la escena.
        if (escena.current) escena.current.regar()
        else riegoPendiente.current = true
      },
    }),
    [],
  )

  useEffect(() => {
    const nodo = anfitrion.current
    if (!nodo) return
    let cancelado = false
    let creada: Escena | null = null

    async function arrancar(destino: HTMLElement) {
      const { Escena: Clase } = await import('./escena.ts')
      if (cancelado) return
      const reducirMovimiento = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      creada = new Clase({ ...inicial.current, reducirMovimiento, onMetricas: setMetricas })
      escena.current = creada
      if (riegoPendiente.current) {
        riegoPendiente.current = false
        creada.regar()
      }
      // Sin WebGL la escena no se dibuja, pero la descripción textual sigue disponible.
      await creada.iniciar(destino).catch(() => {})
    }

    let observador: IntersectionObserver | null = null
    if (typeof IntersectionObserver === 'undefined') {
      void arrancar(nodo)
    } else {
      observador = new IntersectionObserver(
        ([entrada]) => {
          if (entrada?.isIntersecting) {
            observador?.disconnect()
            void arrancar(nodo)
          }
        },
        { rootMargin: '300px' },
      )
      observador.observe(nodo)
    }

    return () => {
      cancelado = true
      observador?.disconnect()
      creada?.destruir()
      escena.current = null
    }
  }, [])

  useEffect(() => {
    escena.current?.actualizar({ etapa, pajaros })
  }, [etapa, pajaros])

  const descripcion = `Tu espacio verde: ${DESCRIPCION[etapa]}${pajaros ? ', con pájaros volando' : ''}.`

  return (
    <div className={estilos.contenedor}>
      <div ref={anfitrion} className={estilos.lienzo} aria-hidden="true" />
      <p className={estilos.soloLectores}>{descripcion}</p>
      {mostrarMetricas && metricas && (
        <output className={estilos.metricas}>
          {metricas.fps} FPS · carga {metricas.cargaMs} ms
        </output>
      )}
    </div>
  )
}
