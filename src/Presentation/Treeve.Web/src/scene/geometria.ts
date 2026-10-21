// Geometría pura de la escena (sin PixiJS): se prueba sin navegador.

export const ETAPAS = ['semilla', 'brote', 'tallo', 'arbol'] as const

/**
 * Etapas PROVISIONALES para el spike. La etapa real la calcula el backend (HU-07a):
 * cuando se defina su contrato, estos nombres se alinean con él.
 */
export type EtapaArbol = (typeof ETAPAS)[number]

export interface FormaArbol {
  alturaTronco: number
  grosorTronco: number
  radioCopa: number
  copas: number
}

const FORMAS: Record<EtapaArbol, FormaArbol> = {
  semilla: { alturaTronco: 0, grosorTronco: 0, radioCopa: 0, copas: 0 },
  brote: { alturaTronco: 22, grosorTronco: 4, radioCopa: 14, copas: 1 },
  tallo: { alturaTronco: 46, grosorTronco: 6, radioCopa: 30, copas: 1 },
  arbol: { alturaTronco: 78, grosorTronco: 10, radioCopa: 58, copas: 3 },
}

export function formaArbol(etapa: EtapaArbol): FormaArbol {
  return FORMAS[etapa]
}

export interface Punto {
  x: number
  y: number
}

/** Rombo isométrico 2:1 centrado en (cx, cy) con semiancho `a`. */
export function romboSuelo(cx: number, cy: number, a: number) {
  return {
    arriba: { x: cx, y: cy - a / 2 },
    derecha: { x: cx + a, y: cy },
    abajo: { x: cx, y: cy + a / 2 },
    izquierda: { x: cx - a, y: cy },
  }
}

/** Posición y aleteo de un pájaro en el instante `ms`. Siempre dentro del área visible. */
export function posicionPajaro(ms: number, indice: number, ancho: number, alto: number) {
  const fase = indice * 1.7
  const velocidad = 0.00018 + indice * 0.00004
  return {
    x: ancho * (0.5 + 0.38 * Math.sin(ms * velocidad + fase)),
    y: alto * (0.2 + 0.08 * Math.sin(ms * 0.0006 + fase) + indice * 0.03),
    aleteo: Math.sin(ms * 0.012 + fase),
  }
}
