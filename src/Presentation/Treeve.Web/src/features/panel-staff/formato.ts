const FECHA = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Bogota' })
const NUMERO = new Intl.NumberFormat('es-CO')

/** "2026-10-16T14:00:00Z" → "16 oct 2026". */
export function formatearFecha(iso: string): string {
  // Se arma por partes: según el idioma regional, Intl escribe "16 de oct de 2026" o "16 oct 2026".
  const partes = Object.fromEntries(FECHA.formatToParts(new Date(iso)).map((parte) => [parte.type, parte.value]))
  return `${partes.day} ${partes.month?.replaceAll('.', '')} ${partes.year}`
}

/** 1240 → "1.240". */
export function formatearNumero(valor: number): string {
  return NUMERO.format(valor)
}

export function porcentaje(parte: number, total: number): number {
  return total === 0 ? 0 : Math.round((parte / total) * 100)
}

export type ItemDePaginacion = number | 'hueco'

/**
 * Qué números de página mostrar: la primera, la última y las vecinas de la actual.
 * Entre dos grupos separados hay un "hueco" (…); si el hueco sería de una sola página, se muestra esa página.
 */
export function paginasVisibles(actual: number, total: number): ItemDePaginacion[] {
  const claves = [...new Set([1, actual - 1, actual, actual + 1, total])].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const resultado: ItemDePaginacion[] = []
  claves.forEach((pagina, i) => {
    const previa = claves[i - 1]
    if (previa !== undefined) {
      const salto = pagina - previa
      if (salto === 2) resultado.push(previa + 1)
      else if (salto > 2) resultado.push('hueco')
    }
    resultado.push(pagina)
  })
  return resultado
}
