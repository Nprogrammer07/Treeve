import type { Lote } from '../features/espacio-verde/lote.ts'

/** Un lote de ejemplo para las pruebas: árbol y flores en nivel 2, bosque en nivel 1, a 2 desahogos de que crezca el bosque. */
export function loteDePrueba(cambios: Partial<Lote> = {}): Lote {
  return {
    etapa: 'tallo',
    niveles: { arbol: 2, flores: 2, bosque: 1 },
    nivelMaximo: 4,
    riegos: 7,
    nutricion: 1,
    riegosParaElSiguiente: 2,
    siguienteEnCrecer: 'bosque',
    completo: false,
    ...cambios,
  }
}
