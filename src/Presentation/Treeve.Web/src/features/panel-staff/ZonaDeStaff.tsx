import { useEffect, useState } from 'react'
import { ErrorApi } from '../../shared/api/clienteApi.ts'
import { Aviso } from '../../shared/ui/Aviso.tsx'
import { Boton } from '../../shared/ui/Boton.tsx'
import { PanelSugerencias } from './PanelSugerencias.tsx'
import estilos from './ZonaDeStaff.module.css'
import type { FuenteDeSugerencias, RolDeStaff } from './tipos.ts'

interface Props {
  /** Pregunta a la API si la persona es staff (GET /api/staff/acceso). */
  comprobarAcceso: () => Promise<RolDeStaff>
  fuente: FuenteDeSugerencias
  apodo: string
  onSalir: () => void
  /** Salir de la zona de staff hacia la pantalla principal. */
  onVolver: () => void
  /** HU-12. Solo se ofrece a quien la API dice que es administrador y mientras exista la pantalla. */
  onAdministracion?: () => void
}

type Resultado = { intento: number; estado: 'ok'; rol: RolDeStaff } | { intento: number; estado: 'denegado' | 'fallo' }

/**
 * HU-10: puerta de la zona de staff. Antes de mostrar nada pregunta a la API: con 200 muestra el panel, con 403
 * dice que no hay permiso, y un 401 lo resuelve el cliente de la API (olvida la sesión y la app pide iniciar sesión).
 * El rol no se deduce ni se guarda: lo decide el backend en cada petición. Ocultar el panel aquí es solo comodidad.
 */
export function ZonaDeStaff({ comprobarAcceso, fuente, apodo, onSalir, onVolver, onAdministracion }: Props) {
  const [intento, setIntento] = useState(0)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  useEffect(() => {
    let vigente = true
    comprobarAcceso()
      .then((rol) => vigente && setResultado({ intento, estado: 'ok', rol }))
      .catch((error: unknown) => vigente && setResultado({ intento, estado: error instanceof ErrorApi && error.estado === 403 ? 'denegado' : 'fallo' }))
    return () => {
      vigente = false
    }
  }, [comprobarAcceso, intento])

  if (resultado === null || resultado.intento !== intento) {
    return (
      <main className={estilos.puerta}>
        <output>Comprobando tu acceso…</output>
      </main>
    )
  }

  if (resultado.estado === 'ok') {
    return <PanelSugerencias fuente={fuente} apodo={apodo} onSalir={onSalir} onAdministracion={resultado.rol === 'administrador' ? onAdministracion : undefined} />
  }

  if (resultado.estado === 'denegado') {
    return (
      <main className={estilos.puerta}>
        <h1 className={estilos.titulo}>Acceso denegado</h1>
        <p>No tienes permiso para entrar al panel de staff.</p>
        <div className={estilos.acciones}>
          <Boton onClick={onVolver}>Volver a Treeve</Boton>
          <Boton variante="suave" onClick={onSalir}>
            Cerrar sesión
          </Boton>
        </div>
      </main>
    )
  }

  return (
    <main className={estilos.puerta}>
      <h1 className={estilos.titulo}>Panel de staff</h1>
      <Aviso>No pudimos comprobar tu acceso. Inténtalo de nuevo en un momento.</Aviso>
      <div className={estilos.acciones}>
        <Boton onClick={() => setIntento((actual) => actual + 1)}>Reintentar</Boton>
        <Boton variante="suave" onClick={onVolver}>
          Volver a Treeve
        </Boton>
      </div>
    </main>
  )
}
