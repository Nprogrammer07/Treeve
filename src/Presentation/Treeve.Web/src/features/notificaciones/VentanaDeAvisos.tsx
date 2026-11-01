import { useId } from 'react'
import { formatearFecha } from '../../shared/formato.ts'
import { Aviso } from '../../shared/ui/Aviso.tsx'
import { Boton } from '../../shared/ui/Boton.tsx'
import { Dialogo } from '../../shared/ui/Dialogo.tsx'
import estilos from './VentanaDeAvisos.module.css'
import type { Notificacion } from './tipos.ts'

interface Props {
  abierto: boolean
  onCerrar: () => void
  notificaciones: Notificacion[]
  cargando: boolean
  fallo: boolean
  falloAlMarcar: boolean
  onReintentar: () => void
  onMarcarLeida: (id: string) => void
  onMarcarTodas: () => void
  /** Para el aviso de una sugerencia respondida: lleva a su historial. app/ decide cómo (las features no se importan entre sí). */
  onVerSugerencias: () => void
  /** Para el aviso de ascenso a staff: lleva a la zona de staff. */
  onIrAStaff: () => void
}

/** HU-12 / HU-11: los avisos de la persona. El texto de cada uno lo decide el backend y se muestra tal cual. */
export function VentanaDeAvisos({ abierto, ...resto }: Props) {
  // La ventana existe solo mientras está abierta, así cada apertura empieza limpia.
  return abierto ? <Ventana {...resto} /> : null
}

function Ventana({ onCerrar, notificaciones, cargando, fallo, falloAlMarcar, onReintentar, onMarcarLeida, onMarcarTodas, onVerSugerencias, onIrAStaff }: Omit<Props, 'abierto'>) {
  const base = useId()
  const sinLeer = notificaciones.filter((n) => !n.leida).length

  // Actuar sobre un aviso (ir a verlo) también lo da por leído.
  const actuar = (n: Notificacion, accion: () => void) => {
    if (!n.leida) onMarcarLeida(n.id)
    accion()
  }

  return (
    <Dialogo abierto titulo="Tus avisos" onCerrar={onCerrar}>
      {cargando && <output>Cargando tus avisos…</output>}
      {fallo && (
        <div className={estilos.reintento}>
          <Aviso>No pudimos cargar tus avisos. Inténtalo de nuevo en un momento.</Aviso>
          <Boton variante="suave" onClick={onReintentar}>
            Reintentar
          </Boton>
        </div>
      )}
      {!cargando && !fallo && notificaciones.length === 0 && <p className={estilos.vacio}>No tienes avisos por ahora.</p>}
      {!cargando && !fallo && notificaciones.length > 0 && (
        <>
          <div className={estilos.resumen}>
            <output className={estilos.conteo}>{sinLeer === 0 ? 'Todo al día.' : sinLeer === 1 ? '1 aviso sin leer' : `${sinLeer} avisos sin leer`}</output>
            {sinLeer > 0 && (
              <Boton variante="suave" onClick={onMarcarTodas}>
                Marcar todos como leídos
              </Boton>
            )}
          </div>
          {falloAlMarcar && <Aviso>No pudimos marcarlo como leído. Inténtalo de nuevo en un momento.</Aviso>}
          <ul className={estilos.lista}>
            {notificaciones.map((n) => {
              const idMensaje = `${base}-${n.id}`
              return (
                <li key={n.id} className={estilos.elemento} data-leida={n.leida}>
                  {!n.leida && <span className={estilos.nuevo}>Nuevo</span>}
                  <p id={idMensaje} className={estilos.mensaje}>
                    {n.mensaje}
                  </p>
                  <p className={estilos.fecha}>{formatearFecha(n.creadaEn)}</p>
                  <div className={estilos.acciones}>
                    {n.tipo === 'sugerencia_respondida' && <Boton onClick={() => actuar(n, onVerSugerencias)}>Ver mis sugerencias</Boton>}
                    {n.tipo === 'ascendido_a_staff' && <Boton onClick={() => actuar(n, onIrAStaff)}>Ir al panel de staff</Boton>}
                    {!n.leida && (
                      <Boton variante="suave" aria-describedby={idMensaje} onClick={() => onMarcarLeida(n.id)}>
                        Marcar como leído
                      </Boton>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Dialogo>
  )
}
