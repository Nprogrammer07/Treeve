import { useId } from 'react'
import { Aviso } from '../../shared/ui/Aviso.tsx'
import { Boton } from '../../shared/ui/Boton.tsx'
import estilos from './PanelAdministracion.module.css'
import { ETIQUETA_ROL } from './texto.ts'
import type { MiembroDelEquipo } from './tipos.ts'

interface Props {
  equipo: MiembroDelEquipo[]
  cargando: boolean
  fallo: boolean
  onReintentar: () => void
  /** Abre la confirmación para quitar a esa persona del staff. */
  onQuitar: (miembro: MiembroDelEquipo) => void
}

/** HU-12: quién forma parte del staff y de la administración. Nunca muestra nombres completos ni correos. */
export function EquipoActual({ equipo, cargando, fallo, onReintentar, onQuitar }: Props) {
  const idTitulo = useId()

  return (
    <section aria-labelledby={idTitulo} className={estilos.tarjeta}>
      <h2 id={idTitulo} className={estilos.tituloTarjeta}>
        Equipo actual
      </h2>
      {cargando && <output>Cargando el equipo…</output>}
      {fallo && (
        <div className={estilos.reintento}>
          <Aviso>No pudimos cargar el equipo. Inténtalo de nuevo en un momento.</Aviso>
          <Boton variante="suave" onClick={onReintentar}>
            Reintentar
          </Boton>
        </div>
      )}
      {!cargando && !fallo && (
        <div className={estilos.contenedorTabla}>
          <table className={estilos.tabla}>
            <caption className={estilos.soloLectores}>Personas con rol de staff o de administración</caption>
            <thead>
              <tr>
                <th scope="col">Usuario</th>
                <th scope="col">Apodo</th>
                <th scope="col">Rol</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {equipo.map((miembro) => (
                <tr key={miembro.id}>
                  <td data-label="Usuario" className={estilos.usuarioNombre}>
                    {miembro.usuario}
                  </td>
                  <td data-label="Apodo">{miembro.apodo}</td>
                  <td data-label="Rol">
                    <span className={`${estilos.rol} ${miembro.rol === 'administrador' ? estilos.rolAdmin : estilos.rolStaff}`}>{ETIQUETA_ROL[miembro.rol]}</span>
                  </td>
                  <td data-label="Acciones">
                    {miembro.rol === 'staff' ? (
                      <button type="button" className={estilos.quitar} aria-label={`Quitar a ${miembro.usuario} del staff`} onClick={() => onQuitar(miembro)}>
                        Quitar del staff
                      </button>
                    ) : (
                      <span className={estilos.sinAccion}>No se cambia desde la aplicación</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className={estilos.ayuda}>La lista nunca muestra nombres completos ni correos. El rol de una persona administradora solo se asigna directamente en la base de datos.</p>
    </section>
  )
}
