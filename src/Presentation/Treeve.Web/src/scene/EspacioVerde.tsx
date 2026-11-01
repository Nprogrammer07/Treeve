import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import estilos from './EspacioVerde.module.css'
import type { Escena, Metricas } from './escena.ts'
import { NIVEL_MAXIMO, type EtapaArbol } from './geometria.ts'

export type { EtapaArbol } from './geometria.ts'

export interface ControlEspacioVerde {
  regar: () => void
  /** Un componente del lote subió de nivel: animación especial. */
  crecer: () => void
}

interface Props {
  etapa: EtapaArbol
  /** Nivel del componente "flores" (1 a 4). Sin indicarlo, el lote se ve completo (por ejemplo, en la vista previa de la página de visitante). */
  nivelFlores?: number
  /** Nivel del componente "bosque" (1 a 4). Sin indicarlo, el lote se ve completo. */
  nivelBosque?: number
  pajaros?: boolean
  /** Solo para el spike de rendimiento (RNF-07): muestra FPS y tiempo de carga. */
  mostrarMetricas?: boolean
  ref?: Ref<ControlEspacioVerde>
}

const DESCRIPCION: Record<EtapaArbol, string> = {
  brote: 'un brote pequeño',
  tallo: 'un tallo joven con sus primeras hojas',
  flor: 'un árbol joven con sus primeras flores',
  'arbol-adulto': 'un árbol adulto, crecido y frondoso',
}

const DESCRIPCION_FLORES = ['unas pocas flores', 'varias flores', 'muchas flores', 'el césped lleno de flores'] as const
const DESCRIPCION_BOSQUE = ['un bosque que empieza a crecer', 'un bosque joven', 'un bosque frondoso', 'un bosque denso a su alrededor'] as const

/** Un nivel del lote como posición de 0 a 3, aunque llegue fuera de rango. */
const nivelDe = (nivel: number): 0 | 1 | 2 | 3 => (Math.min(NIVEL_MAXIMO, Math.max(1, Math.round(nivel))) - 1) as 0 | 1 | 2 | 3

/**
 * API pública de la escena 2.5D. Las features la usan sin conocer PixiJS.
 * PixiJS se descarga aparte (import dinámico) y solo cuando la escena está cerca de verse,
 * para no frenar la carga inicial de la página.
 */
export function EspacioVerde({ etapa, nivelFlores = NIVEL_MAXIMO, nivelBosque = NIVEL_MAXIMO, pajaros = false, mostrarMetricas = false, ref }: Props) {
  const anfitrion = useRef<HTMLDivElement>(null)
  const escena = useRef<Escena | null>(null)
  const riegoPendiente = useRef(false)
  const crecimientoPendiente = useRef(false)
  const inicial = useRef({ etapa, pajaros, nivelFlores, nivelBosque })
  const [metricas, setMetricas] = useState<Metricas | null>(null)

  useImperativeHandle(
    ref,
    () => ({
      regar: () => {
        // Si PixiJS todavía se está descargando, el riego queda pendiente y ocurre al estar lista la escena.
        if (escena.current) escena.current.regar()
        else riegoPendiente.current = true
      },
      crecer: () => {
        if (escena.current) escena.current.crecer()
        else crecimientoPendiente.current = true
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
      if (crecimientoPendiente.current) {
        crecimientoPendiente.current = false
        creada.crecer()
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
    escena.current?.actualizar({ etapa, pajaros, nivelFlores, nivelBosque })
  }, [etapa, pajaros, nivelFlores, nivelBosque])

  const descripcion = `Tu espacio verde: ${DESCRIPCION[etapa]}, ${DESCRIPCION_FLORES[nivelDe(nivelFlores)]} y ${DESCRIPCION_BOSQUE[nivelDe(nivelBosque)]}${pajaros ? ', con pájaros volando' : ''}.`

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
