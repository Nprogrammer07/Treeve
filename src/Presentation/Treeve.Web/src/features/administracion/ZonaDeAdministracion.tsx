import { useEffect, useState } from 'react'
import { ErrorApi } from '../../shared/api/clienteApi.ts'
import { Aviso } from '../../shared/ui/Aviso.tsx'
import { Boton } from '../../shared/ui/Boton.tsx'
import { PanelAdministracion } from './PanelAdministracion.tsx'
import estilos from './ZonaDeAdministracion.module.css'

type RolDeAcceso = 'staff' | 'administrador'

interface Props {
  /** Pregunta a la API cuál es el rol de la persona (GET /api/staff/acceso); lo entrega app/. */
  comprobarAcceso: () => Promise<RolDeAcceso>
  apodo: string
  onSalir: () => void
  /** Vuelve al panel de sugerencias del staff. */
  onVolverASugerencias: () => void
  /** Sale de la zona de staff hacia la pantalla principal. */
  onVolverAlInicio: () => void
}

type Resultado = { intento: number; estado: 'ok'; rol: RolDeAcceso } | { intento: number; estado: 'denegado' | 'fallo' }

/**
 * HU-12: puerta de la zona de administración. Antes de mostrar nada pregunta a la API: solo el rol de administración entra.
 * Una persona de staff que abre esta dirección ve "Acceso denegado" sin que la pantalla llame a /api/admin (que dejaría un intento
 * en el registro de accesos denegados). El rol lo decide siempre el backend en cada petición; ocultar la pantalla es solo comodidad.
 */
export function ZonaDeAdministracion({ comprobarAcceso, apodo, onSalir, onVolverASugerencias, onVolverAlInicio }: Props) {
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

  if (resultado.estado === 'ok' && resultado.rol === 'administrador') {
    return <PanelAdministracion apodo={apodo} onVolver={onVolverASugerencias} onSalir={onSalir} />
  }

  if (resultado.estado === 'ok' || resultado.estado === 'denegado') {
    const esDeStaff = resultado.estado === 'ok'
    return (
      <main className={estilos.puerta}>
        <h1 className={estilos.titulo}>Acceso denegado</h1>
        <p>No tienes permiso para entrar al panel de administración.</p>
        <div className={estilos.acciones}>
          {esDeStaff && <Boton onClick={onVolverASugerencias}>Volver al panel de staff</Boton>}
          <Boton variante={esDeStaff ? 'suave' : 'principal'} onClick={onVolverAlInicio}>
            Volver a Treeve
          </Boton>
          <Boton variante="suave" onClick={onSalir}>
            Cerrar sesión
          </Boton>
        </div>
      </main>
    )
  }

  return (
    <main className={estilos.puerta}>
      <h1 className={estilos.titulo}>Panel de administración</h1>
      <Aviso>No pudimos comprobar tu acceso. Inténtalo de nuevo en un momento.</Aviso>
      <div className={estilos.acciones}>
        <Boton onClick={() => setIntento((actual) => actual + 1)}>Reintentar</Boton>
        <Boton variante="suave" onClick={onVolverAlInicio}>
          Volver a Treeve
        </Boton>
      </div>
    </main>
  )
}
