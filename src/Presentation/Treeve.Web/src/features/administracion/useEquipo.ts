import { useEffect, useState } from 'react'
import { listarEquipo } from './api.ts'
import type { MiembroDelEquipo } from './tipos.ts'

interface Resultado {
  equipo: MiembroDelEquipo[]
  /** Todavía no llegó la primera lista. */
  cargando: boolean
  /** La carga falló y no hay lista que mostrar. */
  fallo: boolean
  reintentar: () => void
}

/**
 * El equipo actual (HU-12). `version` sube cuando algo cambió (se ascendió o se revocó a alguien) y se vuelve a pedir.
 * Mientras se vuelve a pedir se sigue mostrando la lista anterior: la tabla no parpadea.
 */
export function useEquipo(version: number, listar: () => Promise<MiembroDelEquipo[]> = listarEquipo): Resultado {
  const [reintento, setReintento] = useState(0)
  const [respuesta, setRespuesta] = useState<{ clave: string; bien: boolean } | null>(null)
  const [lista, setLista] = useState<MiembroDelEquipo[] | null>(null)
  const clave = `${version}:${reintento}`

  useEffect(() => {
    let vigente = true
    listar()
      .then((nueva) => {
        if (!vigente) return
        setLista(nueva)
        setRespuesta({ clave, bien: true })
      })
      .catch(() => vigente && setRespuesta({ clave, bien: false }))
    return () => {
      vigente = false
    }
  }, [listar, clave])

  const pendiente = respuesta?.clave !== clave
  return {
    equipo: lista ?? [],
    cargando: lista === null && pendiente,
    fallo: lista === null && !pendiente && !respuesta.bien,
    reintentar: () => setReintento((actual) => actual + 1),
  }
}
