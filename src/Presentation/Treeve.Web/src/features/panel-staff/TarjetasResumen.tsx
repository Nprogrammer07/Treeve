import { Icono, type NombreIcono } from '../../shared/ui/Icono.tsx'
import { formatearNumero, porcentaje } from './formato.ts'
import estilos from './PanelSugerencias.module.css'
import type { ResumenSugerencias } from './tipos.ts'

interface Props {
  /** null mientras carga o si no se pudo obtener: se muestran guiones, nunca cifras inventadas. */
  resumen: ResumenSugerencias | null
}

/** Las cifras las calcula el backend sobre todas las sugerencias; el panel solo las muestra. */
export function TarjetasResumen({ resumen }: Props) {
  const cifra = (valor: number | undefined) => (valor === undefined ? '—' : formatearNumero(valor))
  const tarjetas: { icono: NombreIcono; tono: string; titulo: string; valor: number | undefined; detalle: string }[] = [
    { icono: 'bandeja', tono: 'verde', titulo: 'Total de sugerencias', valor: resumen?.total, detalle: 'Recibidas en total' },
    { icono: 'alerta', tono: 'ambar', titulo: 'Pendientes de revisión', valor: resumen?.pendientes, detalle: 'Requieren atención' },
    { icono: 'reloj', tono: 'azul', titulo: 'En revisión', valor: resumen?.enRevision, detalle: 'En proceso' },
    {
      icono: 'verificado',
      tono: 'verde',
      titulo: 'Implementadas',
      valor: resumen?.implementadas,
      detalle: resumen ? `${porcentaje(resumen.implementadas, resumen.total)}% del total` : '—',
    },
  ]

  return (
    <section aria-label="Resumen de sugerencias">
      <dl className={estilos.tarjetas}>
        {tarjetas.map(({ icono, tono, titulo, valor, detalle }) => (
          <div key={titulo} className={estilos.tarjeta}>
            <dt className={estilos.tarjetaTitulo}>{titulo}</dt>
            <span className={estilos.tarjetaIcono} data-tono={tono} aria-hidden="true">
              <Icono nombre={icono} tamano={22} />
            </span>
            <dd className={estilos.cifra}>{cifra(valor)}</dd>
            <dd className={estilos.tarjetaDetalle}>{detalle}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
