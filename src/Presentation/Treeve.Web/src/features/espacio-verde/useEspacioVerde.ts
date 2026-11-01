import { useCallback, useEffect, useState } from 'react'
import { consultarEspacioVerde } from './api.ts'
import type { Lote } from './lote.ts'

interface Resultado {
  /** El último lote que se pudo leer. Mientras se vuelve a pedir, sigue siendo el anterior. */
  lote: Lote | null
  /** Todavía no hay ninguna respuesta (ni lote ni fallo). */
  cargando: boolean
  /** La última petición falló y no hay lote que mostrar. */
  fallo: boolean
  /** Vuelve a pedir el lote y entrega el nuevo (o null si falló). Sirve para comparar antes y después de un desahogo. */
  recargar: () => Promise<Lote | null>
  /** Para el botón "Reintentar" cuando la primera carga falló. */
  reintentar: () => void
}

/** HU-07a: pide el lote al entrar. La carga y el fallo se derivan de la última respuesta, no se guardan por separado. */
export function useEspacioVerde(consultar: () => Promise<Lote> = consultarEspacioVerde): Resultado {
  const [intento, setIntento] = useState(0)
  const [respuesta, setRespuesta] = useState<{ intento: number; lote: Lote | null } | null>(null)
  const [ultimo, setUltimo] = useState<Lote | null>(null)

  useEffect(() => {
    let vigente = true
    consultar()
      .then((lote) => {
        if (!vigente) return
        setUltimo(lote)
        setRespuesta({ intento, lote })
      })
      .catch(() => vigente && setRespuesta({ intento, lote: null }))
    return () => {
      vigente = false
    }
  }, [consultar, intento])

  const recargar = useCallback(async () => {
    try {
      const lote = await consultar()
      setUltimo(lote)
      return lote
    } catch {
      return null
    }
  }, [consultar])

  const cargando = respuesta === null || (respuesta.intento !== intento && ultimo === null)
  const reintentar = useCallback(() => setIntento((actual) => actual + 1), [])
  return { lote: ultimo, cargando, fallo: !cargando && ultimo === null && respuesta?.lote === null, recargar, reintentar }
}
