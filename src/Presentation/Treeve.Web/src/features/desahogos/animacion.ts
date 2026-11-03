/**
 * Si la persona pidió reducir el movimiento al sistema. En tal caso, no se dibuja la pausa ni se escribe
 * letra por letra: el mensaje aparece completo de una vez.
 */
export function prefiereReducirMovimiento(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Cuánto dura la pausa antes de empezar a escribir, y cuánto tarda cada letra en aparecer. En milisegundos. */
export const DURACION_DE_PAUSA = 800
export const INTERVALO_POR_LETRA = 28
