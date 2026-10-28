import { Icono } from '../../shared/ui/Icono.tsx'
import { formatearNumero, paginasVisibles } from './formato.ts'
import estilos from './PanelSugerencias.module.css'

interface Props {
  pagina: number
  tamano: number
  total: number
  onIrA: (pagina: number) => void
}

export function Paginacion({ pagina, tamano, total, onIrA }: Props) {
  const totalPaginas = Math.max(1, Math.ceil(total / tamano))
  const desde = total === 0 ? 0 : (pagina - 1) * tamano + 1
  const hasta = Math.min(pagina * tamano, total)

  return (
    <div className={estilos.pie}>
      <p className={estilos.conteo}>
        Mostrando <strong>{`${formatearNumero(desde)}–${formatearNumero(hasta)}`}</strong> de <strong>{formatearNumero(total)}</strong> sugerencias
      </p>
      <nav aria-label="Paginación" className={estilos.paginas}>
        <button type="button" className={estilos.pagina} aria-label="Página anterior" disabled={pagina <= 1} onClick={() => onIrA(pagina - 1)}>
          <Icono nombre="flechaIzq" tamano={18} />
        </button>
        {paginasVisibles(pagina, totalPaginas).map((item, i) =>
          item === 'hueco' ? (
            <span key={`hueco-${i}`} className={estilos.hueco} aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={estilos.pagina}
              aria-label={`Página ${item}`}
              aria-current={item === pagina ? 'page' : undefined}
              onClick={() => onIrA(item)}
            >
              {item}
            </button>
          ),
        )}
        <button type="button" className={estilos.pagina} aria-label="Página siguiente" disabled={pagina >= totalPaginas} onClick={() => onIrA(pagina + 1)}>
          <Icono nombre="flechaDer" tamano={18} />
        </button>
      </nav>
    </div>
  )
}
