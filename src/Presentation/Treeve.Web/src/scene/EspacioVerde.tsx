import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import estilos from './EspacioVerde.module.css'
import { Escena, type Metricas } from './escena.ts'
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

/** API pública de la escena 2.5D. Las features la usan sin conocer PixiJS. */
export function EspacioVerde({ etapa, pajaros = false, mostrarMetricas = false, ref }: Props) {
  const anfitrion = useRef<HTMLDivElement>(null)
  const escena = useRef<Escena | null>(null)
  const inicial = useRef({ etapa, pajaros })
  const [metricas, setMetricas] = useState<Metricas | null>(null)

  useImperativeHandle(ref, () => ({ regar: () => escena.current?.regar() }), [])

  useEffect(() => {
    const nodo = anfitrion.current
    if (!nodo) return
    const reducirMovimiento = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const nueva = new Escena({ ...inicial.current, reducirMovimiento, onMetricas: setMetricas })
    escena.current = nueva
    // Sin WebGL la escena no se dibuja, pero la descripción textual sigue disponible.
    nueva.iniciar(nodo).catch(() => {})
    return () => {
      nueva.destruir()
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
