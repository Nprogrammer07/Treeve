import type { EtapaArbol } from '../../scene/EspacioVerde.tsx'
import type { ComponenteDelLote } from './tipos.ts'

/** El lote de la persona tal como lo necesita la pantalla: lo que calcula el backend (HU-07a), nunca recalculado aquí. */
export interface Lote {
  etapa: EtapaArbol
  niveles: Record<ComponenteDelLote, number>
  nivelMaximo: number
  riegos: number
  /** Desahogos acumulados hacia el siguiente crecimiento. */
  nutricion: number
  riegosParaElSiguiente: number
  siguienteEnCrecer: ComponenteDelLote | null
  completo: boolean
}

export const NOMBRE_DE_ETAPA: Record<EtapaArbol, string> = {
  brote: 'Brote',
  tallo: 'Tallo',
  flor: 'Flor',
  'arbol-adulto': 'Árbol adulto',
}

/** La etapa que corresponde a cada nivel del árbol (nivel 1 = brote … nivel 4 = árbol adulto). */
const ETAPA_POR_NIVEL: readonly EtapaArbol[] = ['brote', 'tallo', 'flor', 'arbol-adulto']

const FRASE_DEL_COMPONENTE: Record<ComponenteDelLote, { sujeto: string; verbo: string }> = {
  arbol: { sujeto: 'el árbol', verbo: 'crezca' },
  flores: { sujeto: 'las flores', verbo: 'crezcan' },
  bosque: { sujeto: 'el bosque', verbo: 'crezca' },
}

/** Qué componente creció entre dos lotes (el backend hace crecer uno solo por vez), con su nivel nuevo; null si nada creció. */
export function crecimientoEntre(antes: Lote, despues: Lote): { componente: ComponenteDelLote; nivel: number } | null {
  for (const componente of ['arbol', 'flores', 'bosque'] as const) {
    if (despues.niveles[componente] > antes.niveles[componente]) return { componente, nivel: despues.niveles[componente] }
  }
  return null
}

/** Texto que cuenta el crecimiento: la escena es un dibujo y esto es su versión en palabras. */
export function textoDeCrecimiento(componente: ComponenteDelLote, nivel: number): string {
  const detalle =
    componente === 'arbol'
      ? `El árbol llegó a la etapa ${NOMBRE_DE_ETAPA[ETAPA_POR_NIVEL[nivel - 1] ?? 'brote']}.`
      : componente === 'flores'
        ? `Las flores subieron al nivel ${nivel}.`
        : `El bosque subió al nivel ${nivel}.`
  return `¡Tu espacio verde creció! ${detalle}`
}

/** "Te faltan 2 desahogos para que crezca el bosque.", o que el lote ya está completo. Vacío si no hay nada que decir. */
export function textoDeProgreso(lote: Lote): string {
  if (lote.completo) return '¡Tu espacio verde está completo!'
  if (lote.siguienteEnCrecer === null || lote.riegosParaElSiguiente <= 0) return ''
  const { sujeto, verbo } = FRASE_DEL_COMPONENTE[lote.siguienteEnCrecer]
  const faltan = lote.riegosParaElSiguiente
  return `${faltan === 1 ? 'Te falta 1 desahogo' : `Te faltan ${faltan} desahogos`} para que ${verbo} ${sujeto}.`
}
