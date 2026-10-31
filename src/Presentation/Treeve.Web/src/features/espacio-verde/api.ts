import { pedirApi } from '../../shared/api/clienteApi.ts'
import { ETAPAS } from '../../scene/geometria.ts'
import type { Lote } from './lote.ts'
import { COMPONENTES, type ComponenteDelLote, type EspacioVerdeResponse } from './tipos.ts'

const esComponente = (valor: string): valor is ComponenteDelLote => (COMPONENTES as readonly string[]).includes(valor)
const esEtapa = (valor: string): valor is Lote['etapa'] => (ETAPAS as readonly string[]).includes(valor)

/**
 * HU-07a: el lote de la persona (árbol, flores y bosque, cada uno con su nivel). Se pide al entrar al espacio verde y
 * después de guardar un desahogo. Si la API trae algo que no se conoce, falla en vez de dibujar algo equivocado.
 */
export async function consultarEspacioVerde(): Promise<Lote> {
  const r = await pedirApi<EspacioVerdeResponse>('/api/espacio-verde')
  if (!esEtapa(r.etapaDelArbol)) throw new Error('La API entregó una etapa del árbol desconocida')
  if (r.siguienteEnCrecer !== null && !esComponente(r.siguienteEnCrecer)) throw new Error('La API entregó un componente desconocido')

  const niveles: Partial<Record<ComponenteDelLote, number>> = {}
  for (const { componente, nivel } of r.componentes) {
    if (!esComponente(componente)) throw new Error('La API entregó un componente desconocido')
    niveles[componente] = nivel
  }
  const { arbol, flores, bosque } = niveles
  if (arbol === undefined || flores === undefined || bosque === undefined) throw new Error('La API no entregó los tres componentes del lote')

  return {
    etapa: r.etapaDelArbol,
    niveles: { arbol, flores, bosque },
    nivelMaximo: r.nivelMaximo,
    riegos: r.riegos,
    nutricion: r.nutricion,
    riegosParaElSiguiente: r.riegosParaElSiguiente,
    siguienteEnCrecer: r.siguienteEnCrecer,
    completo: r.completo,
  }
}
