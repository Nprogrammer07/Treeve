import { useEffect, useState } from 'react'
import { TAMANO_DE_PAGINA } from './texto.ts'
import type { ConsultaDeRegistros, PaginaDeRegistros } from './tipos.ts'

interface Resultado<T> {
  registros: T[]
  hayMas: boolean
  /** Filas que se saltaron antes de esta página. */
  desplazamiento: number
  cargando: boolean
  fallo: boolean
  anterior: () => void
  siguiente: () => void
  reintentar: () => void
}

/**
 * Una página de un registro de solo lectura (HU-12). La paginación la hace el servidor: no entrega el total, solo si hay más.
 * `version` sube cuando algo cambió y hay que volver a pedir (por ejemplo, tras ascender a alguien), y vuelve a la primera página.
 * "Cargando" y "falló" se derivan de la última respuesta: no se guardan por separado.
 * `cargar` debe ser estable (una función del módulo): si cambia en cada dibujo, se volvería a pedir sin parar.
 */
export function usePaginaDeRegistros<T>(cargar: (consulta: ConsultaDeRegistros) => Promise<PaginaDeRegistros<T>>, version: number): Resultado<T> {
  const [posicion, setPosicion] = useState({ version, desplazamiento: 0 })
  const [reintento, setReintento] = useState(0)
  const [respuesta, setRespuesta] = useState<{ clave: string; pagina: PaginaDeRegistros<T> | null } | null>(null)

  // Si la versión cambió, se vuelve a la primera página (derivado en el dibujo, sin efectos).
  const desplazamiento = posicion.version === version ? posicion.desplazamiento : 0
  const clave = `${version}:${desplazamiento}:${reintento}`

  useEffect(() => {
    let vigente = true
    cargar({ limite: TAMANO_DE_PAGINA, desplazamiento })
      .then((pagina) => vigente && setRespuesta({ clave, pagina }))
      .catch(() => vigente && setRespuesta({ clave, pagina: null }))
    return () => {
      vigente = false
    }
  }, [cargar, clave, desplazamiento])

  const alDia = respuesta?.clave === clave
  const ir = (nuevo: number) => setPosicion({ version, desplazamiento: Math.max(0, nuevo) })

  return {
    registros: alDia ? (respuesta.pagina?.registros ?? []) : [],
    hayMas: alDia ? (respuesta.pagina?.hayMas ?? false) : false,
    desplazamiento,
    cargando: !alDia,
    fallo: alDia && respuesta.pagina === null,
    anterior: () => ir(desplazamiento - TAMANO_DE_PAGINA),
    siguiente: () => ir(desplazamiento + TAMANO_DE_PAGINA),
    reintentar: () => setReintento((actual) => actual + 1),
  }
}
