import { useState } from 'react'
import { Boton } from '../../shared/ui/Boton.tsx'
import { Icono } from '../../shared/ui/Icono.tsx'
import { ascender, listarAccesosDenegados, listarCambiosDeRol, revocar } from './api.ts'
import { AscenderAStaff } from './AscenderAStaff.tsx'
import { ConfirmarRevocacion } from './ConfirmarRevocacion.tsx'
import { EquipoActual } from './EquipoActual.tsx'
import estilos from './PanelAdministracion.module.css'
import { RegistrosDeAdministracion } from './RegistrosDeAdministracion.tsx'
import type { MiembroDelEquipo } from './tipos.ts'
import { useEquipo } from './useEquipo.ts'

interface Props {
  /** Apodo de la persona administradora que tiene la sesión abierta. */
  apodo: string
  /** Vuelve al panel de sugerencias del staff. */
  onVolver: () => void
  onSalir: () => void
}

/**
 * HU-12: panel de administración (equipo y registros). La seguridad (que solo entre la administración) es del backend en cada
 * petición: esta pantalla no la reemplaza, solo cuenta lo que la API permite hacer.
 */
export function PanelAdministracion({ apodo, onVolver, onSalir }: Props) {
  // Sube cuando se asciende o se revoca a alguien: el equipo y los registros se vuelven a pedir.
  const [version, setVersion] = useState(0)
  const [quitando, setQuitando] = useState<MiembroDelEquipo | null>(null)
  const [aviso, setAviso] = useState('')
  const { equipo, cargando, fallo, reintentar } = useEquipo(version)

  return (
    <div className={estilos.pagina}>
      <header className={estilos.encabezado}>
        <div className={estilos.interior}>
          <div className={estilos.marca}>
            <span className={estilos.logo}>
              <Icono nombre="hoja" tamano={22} />
            </span>
            <span className={estilos.nombre}>Treeve</span>
            <span className={estilos.pildora}>
              <Icono nombre="escudo" tamano={16} />
              Panel de Administración
            </span>
          </div>
          <div className={estilos.sesion}>
            <span>
              Administración: <strong>{apodo}</strong>
            </span>
            <Boton variante="suave" onClick={onVolver}>
              Volver a sugerencias
            </Boton>
            <button type="button" className={estilos.cerrarSesion} onClick={onSalir}>
              <Icono nombre="salir" tamano={18} />
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className={estilos.principal}>
        <div>
          <h1 className={estilos.titulo}>Gestión del equipo</h1>
          <p className={estilos.subtitulo}>Quién forma parte del staff de Treeve y qué ha cambiado.</p>
        </div>

        <AscenderAStaff
          ascender={ascender}
          onAscendida={() => {
            setAviso('')
            setVersion((actual) => actual + 1)
          }}
        />

        <output className={estilos.exito}>{aviso}</output>
        <EquipoActual equipo={equipo} cargando={cargando} fallo={fallo} onReintentar={reintentar} onQuitar={setQuitando} />

        <RegistrosDeAdministracion version={version} cargarCambios={listarCambiosDeRol} cargarAccesos={listarAccesosDenegados} />
      </main>

      <ConfirmarRevocacion
        miembro={quitando}
        revocar={revocar}
        onCerrar={() => setQuitando(null)}
        onRevocada={(resultado) => {
          setQuitando(null)
          setAviso(`${resultado.usuario} ya no forma parte del staff.`)
          setVersion((actual) => actual + 1)
        }}
      />
    </div>
  )
}
