/**
 * Si la persona pidió reducir el movimiento al sistema. En tal caso, el mensaje aparece completo de una vez,
 * sin pausa ni escritura letra por letra.
 */
export function prefiereReducirMovimiento(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Pausa antes de empezar a escribir, en milisegundos. */
export const DURACION_DE_PAUSA = 800

/** Tope en el que la duración TOTAL (pausa + escritura) se mantiene aunque el texto sea largo. */
export const DURACION_TOTAL_OBJETIVO = 3500

/** Intervalo cómodo para textos cortos. En textos largos se acorta para no pasar DURACION_TOTAL_OBJETIVO. */
export const INTERVALO_POR_LETRA = 28

/** Mínimo que no se cruza aunque el texto sea muy largo: por debajo deja de leerse como "escritura". */
const INTERVALO_MINIMO = 10

/** Cuánto esperar por letra para este texto, sin bajar del mínimo ni subir del intervalo cómodo. */
export function intervaloParaTexto(texto: string): number {
  const letras = Math.max(texto.length, 1)
  const encajeExacto = (DURACION_TOTAL_OBJETIVO - DURACION_DE_PAUSA) / letras
  return Math.max(INTERVALO_MINIMO, Math.min(INTERVALO_POR_LETRA, encajeExacto))
}
