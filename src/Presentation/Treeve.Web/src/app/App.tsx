import { lazy, Suspense, useRef, useState } from 'react'
import { FlujoDesahogo } from '../features/desahogos/FlujoDesahogo.tsx'
import { PantallaEspacioVerde } from '../features/espacio-verde/PantallaEspacioVerde.tsx'
import { FormularioLogin } from '../features/identidad/FormularioLogin.tsx'
import { FormularioRegistro } from '../features/identidad/FormularioRegistro.tsx'
import { crearMotorSonido } from '../features/sonidos/motor.ts'
import { SelectorSonido } from '../features/sonidos/SelectorSonido.tsx'
import { PaginaVisitante, type ModoDeAcceso } from '../features/visitante/PaginaVisitante.tsx'
import type { ControlEspacioVerde, EtapaArbol } from '../scene/EspacioVerde.tsx'
import { borrarSesion } from '../shared/api/sesion.ts'
import { useSesion } from '../shared/api/useSesion.ts'
import { BancoEscena } from './BancoEscena.tsx'

// El banco de pruebas del panel de staff solo existe en desarrollo: en producción esta rama se elimina del paquete.
const BancoStaff = import.meta.env.DEV ? lazy(() => import('./BancoStaff.tsx')) : null

// TEMPORAL: la etapa real la calcula el backend (HU-07a) y se pedirá a la API cuando exista su contrato.
const ETAPA_TEMPORAL: EtapaArbol = 'tallo'

/**
 * Composición de la aplicación: aquí se unen las features, que no se conocen entre sí.
 * Sin sesión se ve la página de visitante; al registrarse o iniciar sesión (HU-02, HU-03a) la sesión queda abierta
 * y la app pasa sola al espacio verde. Desde ahí, "Desahogarme" abre la elección de emoción y luego la hoja.
 */
function App() {
  const sesion = useSesion()
  // Un solo motor de audio para toda la app: el sonido sigue sonando al cambiar de pantalla (HU-08).
  const [motor] = useState(crearMotorSonido)
  const [modoDeAcceso, setModoDeAcceso] = useState<ModoDeAcceso>('registro')
  const [desahogoAbierto, setDesahogoAbierto] = useState(false)
  const [aviso, setAviso] = useState('')
  const espacioVerde = useRef<ControlEspacioVerde>(null)

  if (import.meta.env.DEV && window.location.hash === '#escena') return <BancoEscena />
  if (import.meta.env.DEV && BancoStaff && window.location.hash === '#staff') {
    return (
      <Suspense fallback={null}>
        <BancoStaff />
      </Suspense>
    )
  }

  if (!sesion) {
    return (
      <PaginaVisitante
        acceso={
          modoDeAcceso === 'registro' ? (
            <FormularioRegistro onIrALogin={() => setModoDeAcceso('login')} />
          ) : (
            <FormularioLogin onIrARegistro={() => setModoDeAcceso('registro')} />
          )
        }
        onElegirAcceso={setModoDeAcceso}
        controlesSonido={<SelectorSonido motor={motor} />}
        mostrarMetricas={import.meta.env.DEV}
      />
    )
  }

  function salir() {
    // Solo olvida el token en este navegador: la sesión sigue vigente en el servidor hasta que venza.
    setDesahogoAbierto(false)
    setAviso('')
    borrarSesion()
  }

  function alGuardar() {
    setDesahogoAbierto(false)
    setAviso('Tu desahogo regó tu espacio verde.')
    espacioVerde.current?.regar()
  }

  return (
    <>
      <PantallaEspacioVerde
        ref={espacioVerde}
        apodo={sesion.apodo}
        etapa={ETAPA_TEMPORAL}
        aviso={aviso}
        controlesSonido={<SelectorSonido motor={motor} compacto />}
        onDesahogarme={() => {
          setAviso('')
          setDesahogoAbierto(true)
        }}
        onSalir={salir}
        mostrarMetricas={import.meta.env.DEV}
      />
      <FlujoDesahogo abierto={desahogoAbierto} onCerrar={() => setDesahogoAbierto(false)} alGuardar={alGuardar} />
    </>
  )
}

export default App
