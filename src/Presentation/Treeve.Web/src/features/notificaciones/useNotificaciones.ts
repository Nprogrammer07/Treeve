import { useEffect, useState } from 'react'
import { listarNotificaciones, marcarComoLeida } from './api.ts'
import type { Notificacion } from './tipos.ts'

interface Resultado {
  notificaciones: Notificacion[]
  /** Cuántos de los avisos cargados siguen sin leer (la API entrega los 50 más recientes). */
  sinLeer: number
  /** Todavía no llegó la primera lista. */
  cargando: boolean
  /** La primera carga falló y no hay lista que mostrar. */
  fallo: boolean
  /** La última vez que se intentó marcar un aviso como leído, falló (el aviso vuelve a verse sin leer). */
  falloAlMarcar: boolean
  /** Vuelve a pedir la lista. Si falla, se conserva la que ya había. */
  recargar: () => void
  marcarLeida: (id: string) => Promise<void>
  marcarTodasLeidas: () => Promise<void>
}

/**
 * HU-12 / HU-11: los avisos de la persona. Se piden al entrar, cada vez que se piden de nuevo (por ejemplo al abrir la ventana)
 * y cuando vuelve a la pestaña; no hay consultas cada pocos segundos. Marcar como leído se ve al instante y se deshace si la API falla.
 */
export function useNotificaciones(listar: () => Promise<Notificacion[]> = listarNotificaciones, marcar: (id: string) => Promise<void> = marcarComoLeida): Resultado {
  const [version, setVersion] = useState(0)
  const [respuesta, setRespuesta] = useState<{ version: number; bien: boolean } | null>(null)
  const [lista, setLista] = useState<Notificacion[] | null>(null)
  // Los avisos que esta persona ya marcó como leídos aquí. Se superponen a cualquier lista que llegue: una lista pedida ANTES de
  // marcarlo puede responder DESPUÉS y traer el aviso como sin leer, y un aviso leído nunca vuelve a ser "sin leer".
  const [leidasAqui, setLeidasAqui] = useState<ReadonlySet<string>>(new Set())
  const [falloAlMarcar, setFalloAlMarcar] = useState(false)

  useEffect(() => {
    let vigente = true
    listar()
      .then((nueva) => {
        if (!vigente) return
        setLista(nueva)
        setRespuesta({ version, bien: true })
      })
      .catch(() => vigente && setRespuesta({ version, bien: false }))
    return () => {
      vigente = false
    }
  }, [listar, version])

  // Al volver a la pestaña (de otra pestaña o de otra aplicación) se actualiza una vez: así llega un aviso nuevo sin consultar a cada rato.
  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === 'visible') setVersion((actual) => actual + 1)
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [])

  const actual = (lista ?? []).map((n) => (leidasAqui.has(n.id) ? { ...n, leida: true } : n))
  // Hay una petición en curso mientras la última respuesta no sea de la versión actual.
  const pendiente = respuesta === null || respuesta.version !== version

  const cambiarMarcas = (ids: Iterable<string>, marcada: boolean) =>
    setLeidasAqui((previas) => {
      const siguientes = new Set(previas)
      for (const id of ids) {
        if (marcada) siguientes.add(id)
        else siguientes.delete(id)
      }
      return siguientes
    })

  async function marcarLeida(id: string) {
    setFalloAlMarcar(false)
    cambiarMarcas([id], true)
    try {
      await marcar(id)
    } catch {
      cambiarMarcas([id], false)
      setFalloAlMarcar(true)
    }
  }

  async function marcarTodasLeidas() {
    const pendientes = actual.filter((n) => !n.leida)
    setFalloAlMarcar(false)
    cambiarMarcas(
      pendientes.map((n) => n.id),
      true,
    )
    const resultados = await Promise.allSettled(pendientes.map((n) => marcar(n.id)))
    const fallidos = pendientes.filter((_, i) => resultados[i]?.status === 'rejected').map((n) => n.id)
    if (fallidos.length > 0) {
      cambiarMarcas(fallidos, false)
      setFalloAlMarcar(true)
    }
  }

  return {
    notificaciones: actual,
    sinLeer: actual.filter((n) => !n.leida).length,
    cargando: lista === null && pendiente,
    fallo: lista === null && !pendiente && respuesta.bien === false,
    falloAlMarcar,
    recargar: () => setVersion((v) => v + 1),
    marcarLeida,
    marcarTodasLeidas,
  }
}
