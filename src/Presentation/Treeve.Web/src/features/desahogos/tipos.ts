// Espejo de los DTOs de Treeve.Api (Endpoints/Desahogos). Si cambia la API, cambia aquí.
export const EMOCIONES = ['tristeza', 'rabia', 'miedo', 'duda', 'felicidad'] as const

export type Emocion = (typeof EMOCIONES)[number]

export interface CrearNotaRequest {
  emocion: Emocion
  texto: string
}

export interface CrearNotaResponse {
  notaId: string
  creadaEn: string
}
