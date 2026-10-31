const FECHA = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Bogota' })

/** "2026-10-16T17:00:00Z" → "16 oct 2026", en hora de Colombia. */
export function formatearFecha(iso: string): string {
  // Se arma por partes: según el idioma regional, Intl escribe "16 de oct de 2026" o "16 oct 2026".
  const partes = Object.fromEntries(FECHA.formatToParts(new Date(iso)).map((parte) => [parte.type, parte.value]))
  return `${partes.day} ${partes.month?.replaceAll('.', '')} ${partes.year}`
}
