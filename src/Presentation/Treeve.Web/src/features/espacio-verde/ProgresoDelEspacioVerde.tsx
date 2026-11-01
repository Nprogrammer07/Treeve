import { Aviso } from '../../shared/ui/Aviso.tsx'
import { Boton } from '../../shared/ui/Boton.tsx'
import { NOMBRE_DE_ETAPA, textoDeProgreso, type Lote } from './lote.ts'
import estilos from './ProgresoDelEspacioVerde.module.css'

interface Props {
  lote: Lote | null
  cargando: boolean
  fallo: boolean
  onReintentar: () => void
}

/**
 * HU-07a: el estado real del lote (nivel de cada componente y progreso hacia el siguiente crecimiento).
 * Todo viene de la API; aquí no se calcula ni se inventa nada. Sin datos, no hay cifras.
 */
export function ProgresoDelEspacioVerde({ lote, cargando, fallo, onReintentar }: Props) {
  if (lote === null) {
    return (
      <section aria-label="Estado de tu espacio verde" className={estilos.tarjeta}>
        {cargando && <output>Cargando tu espacio verde…</output>}
        {fallo && (
          <div className={estilos.reintento}>
            <Aviso>No pudimos cargar tu espacio verde. Inténtalo de nuevo en un momento.</Aviso>
            <Boton variante="suave" onClick={onReintentar}>
              Reintentar
            </Boton>
          </div>
        )}
      </section>
    )
  }

  const total = lote.nutricion + lote.riegosParaElSiguiente
  const texto = textoDeProgreso(lote)
  const componentes = [
    { nombre: 'Árbol', valor: NOMBRE_DE_ETAPA[lote.etapa] },
    { nombre: 'Flores', valor: `Nivel ${lote.niveles.flores} de ${lote.nivelMaximo}` },
    { nombre: 'Bosque', valor: `Nivel ${lote.niveles.bosque} de ${lote.nivelMaximo}` },
  ]

  return (
    <section aria-label="Estado de tu espacio verde" className={estilos.tarjeta}>
      <dl className={estilos.componentes}>
        {componentes.map(({ nombre, valor }) => (
          <div key={nombre} className={estilos.componente}>
            <dt className={estilos.nombre}>{nombre}</dt>
            <dd className={estilos.valor}>{valor}</dd>
          </div>
        ))}
      </dl>
      {!lote.completo && total > 0 && (
        <progress className={estilos.barra} aria-label="Progreso hacia el siguiente crecimiento" max={total} value={lote.nutricion} />
      )}
      {texto && <p className={estilos.texto}>{texto}</p>}
    </section>
  )
}
