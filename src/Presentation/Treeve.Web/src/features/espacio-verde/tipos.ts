// Espejo de los DTOs de Treeve.Api (docs/guias/api-espacio-verde.md, HU-07a). Si cambia la API, cambia aquí.
export const COMPONENTES = ['arbol', 'flores', 'bosque'] as const
export type ComponenteDelLote = (typeof COMPONENTES)[number]

export interface NivelDeComponenteResponse {
  componente: string
  nivel: number
}

export interface EspacioVerdeResponse {
  etapaDelArbol: string
  componentes: NivelDeComponenteResponse[]
  nivelMaximo: number
  riegos: number
  nutricion: number
  riegosParaElSiguiente: number
  siguienteEnCrecer: string | null
  completo: boolean
}
