import { useId, useState, type ReactNode } from 'react'
import { formatearFecha } from '../../shared/formato.ts'
import { Aviso } from '../../shared/ui/Aviso.tsx'
import { Boton } from '../../shared/ui/Boton.tsx'
import estilos from './PanelAdministracion.module.css'
import { ETIQUETA_ROL, PERSONA_ELIMINADA } from './texto.ts'
import type { ConsultaDeRegistros, PaginaDeRegistros, RegistroDeAcceso, RegistroDeRol, Rol } from './tipos.ts'
import { usePaginaDeRegistros } from './usePaginaDeRegistros.ts'

interface Props {
  /** Sube cuando algo cambió y los registros deben volver a pedirse desde la primera página. */
  version: number
  cargarCambios: (consulta: ConsultaDeRegistros) => Promise<PaginaDeRegistros<RegistroDeRol>>
  cargarAccesos: (consulta: ConsultaDeRegistros) => Promise<PaginaDeRegistros<RegistroDeAcceso>>
}

type Pestana = 'roles' | 'accesos'

/** HU-12: los dos registros inmutables, de solo lectura: cambios de rol y accesos denegados. */
export function RegistrosDeAdministracion({ version, cargarCambios, cargarAccesos }: Props) {
  const idTitulo = useId()
  const [pestana, setPestana] = useState<Pestana>('roles')

  return (
    <section aria-labelledby={idTitulo} className={estilos.tarjeta}>
      <h2 id={idTitulo} className={estilos.tituloTarjeta}>
        Registros
      </h2>
      <p className={estilos.texto}>{pestana === 'roles' ? 'Solo se pueden consultar: no se pueden modificar ni borrar.' : 'Intentos de entrar a rutas de staff o de administración sin permiso. Solo se pueden consultar.'}</p>
      <div className={estilos.pestanas}>
        <button type="button" className={estilos.pestana} aria-pressed={pestana === 'roles'} onClick={() => setPestana('roles')}>
          Cambios de rol
        </button>
        <button type="button" className={estilos.pestana} aria-pressed={pestana === 'accesos'} onClick={() => setPestana('accesos')}>
          Accesos denegados
        </button>
      </div>
      {pestana === 'roles' ? <CambiosDeRol version={version} cargar={cargarCambios} /> : <AccesosDenegados version={version} cargar={cargarAccesos} />}
    </section>
  )
}

/** Un rol con acceso (staff o administración) se resalta; "usuario" no. */
const Cambio = ({ anterior, nuevo }: { anterior: Rol; nuevo: Rol }) => {
  const resaltar = (rol: Rol) => (rol === 'usuario' ? ETIQUETA_ROL[rol] : <strong>{ETIQUETA_ROL[rol]}</strong>)
  return (
    <>
      {resaltar(anterior)} → {resaltar(nuevo)}
    </>
  )
}

const Persona = ({ nombre }: { nombre: string | null }) => (nombre === null ? <span className={estilos.eliminada}>{PERSONA_ELIMINADA}</span> : <span className={estilos.usuarioNombre}>{nombre}</span>)

function CambiosDeRol({ version, cargar }: { version: number; cargar: Props['cargarCambios'] }) {
  const pagina = usePaginaDeRegistros(cargar, version)

  return (
    <Registro pagina={pagina} descripcion="Cambios de rol, del más reciente al más antiguo" columnas={['Fecha', 'Quién lo hizo', 'A quién', 'Cambio']}>
      {pagina.registros.map((r) => (
        <tr key={r.id}>
          <td data-label="Fecha">{formatearFecha(r.fecha)}</td>
          <td data-label="Quién lo hizo">
            <Persona nombre={r.administrador} />
          </td>
          <td data-label="A quién">
            <Persona nombre={r.usuarioAfectado} />
          </td>
          <td data-label="Cambio">
            <Cambio anterior={r.rolAnterior} nuevo={r.rolNuevo} />
          </td>
        </tr>
      ))}
    </Registro>
  )
}

function AccesosDenegados({ version, cargar }: { version: number; cargar: Props['cargarAccesos'] }) {
  const pagina = usePaginaDeRegistros(cargar, version)

  return (
    <Registro pagina={pagina} descripcion="Accesos denegados, del más reciente al más antiguo" columnas={['Fecha', 'Persona', 'Ruta', 'Rol requerido', 'IP']}>
      {pagina.registros.map((r) => (
        <tr key={r.id}>
          <td data-label="Fecha">{formatearFecha(r.fecha)}</td>
          <td data-label="Persona">
            <Persona nombre={r.usuario} />
          </td>
          <td data-label="Ruta" className={estilos.codigo}>
            {r.recurso}
          </td>
          <td data-label="Rol requerido">{ETIQUETA_ROL[r.rolRequerido]}</td>
          <td data-label="IP" className={estilos.codigo}>
            {r.ip ?? 'No disponible'}
          </td>
        </tr>
      ))}
    </Registro>
  )
}

interface PropsRegistro {
  pagina: Pick<ReturnType<typeof usePaginaDeRegistros>, 'registros' | 'hayMas' | 'desplazamiento' | 'cargando' | 'fallo' | 'anterior' | 'siguiente' | 'reintentar'>
  descripcion: string
  columnas: string[]
  children: ReactNode
}

/** La tabla con su paginación. La API no entrega el total: solo si hay otra página. */
function Registro({ pagina, descripcion, columnas, children }: PropsRegistro) {
  if (pagina.cargando) return <output>Cargando el registro…</output>

  if (pagina.fallo) {
    return (
      <div className={estilos.reintento}>
        <Aviso>No pudimos cargar el registro. Inténtalo de nuevo en un momento.</Aviso>
        <Boton variante="suave" onClick={pagina.reintentar}>
          Reintentar
        </Boton>
      </div>
    )
  }

  const cantidad = pagina.registros.length

  return (
    <>
      {cantidad === 0 ? (
        <p className={estilos.vacio}>No hay registros todavía.</p>
      ) : (
        <div className={estilos.contenedorTabla}>
          <table className={estilos.tabla}>
            <caption className={estilos.soloLectores}>{descripcion}</caption>
            <thead>
              <tr>
                {columnas.map((columna) => (
                  <th key={columna} scope="col">
                    {columna}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{children}</tbody>
          </table>
        </div>
      )}
      <div className={estilos.pie}>
        <p className={estilos.conteo}>{cantidad === 0 ? 'Sin registros en esta página' : <>Mostrando <strong>{`${pagina.desplazamiento + 1}–${pagina.desplazamiento + cantidad}`}</strong></>}</p>
        <nav aria-label="Paginación del registro" className={estilos.paginas}>
          <Boton variante="suave" onClick={pagina.anterior} disabled={pagina.desplazamiento === 0}>
            Anterior
          </Boton>
          <Boton variante="suave" onClick={pagina.siguiente} disabled={!pagina.hayMas}>
            Siguiente
          </Boton>
        </nav>
      </div>
    </>
  )
}
