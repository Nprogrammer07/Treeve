// Espejo de los DTOs de Treeve.Api (Endpoints/Desahogos). Si cambia la API, cambia aquí.
export const EMOCIONES = ['tristeza', 'rabia', 'miedo', 'duda', 'felicidad'] as const

export type Emocion = (typeof EMOCIONES)[number]

export interface CrearNotaRequest {
  emocion: Emocion
  texto: string
}

/** Respuesta al desahogo (HU-06). Si `esDeCrisis`, el texto es el mensaje fijo de crisis. Nombra a la persona: no se registra ni se guarda. */
export interface MensajeDeApoyo {
  texto: string
  esDeCrisis: boolean
}

export interface CrearNotaResponse {
  notaId: string
  creadaEn: string
  mensajeDeApoyo: MensajeDeApoyo
}
