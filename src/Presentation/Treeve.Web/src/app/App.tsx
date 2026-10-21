import { useState } from 'react'
import { FlujoDesahogo } from '../features/desahogos/FlujoDesahogo.tsx'
import { PantallaEspacioVerde } from '../features/espacio-verde/PantallaEspacioVerde.tsx'
import { FormularioLogin } from '../features/identidad/FormularioLogin.tsx'
import { FormularioRegistro } from '../features/identidad/FormularioRegistro.tsx'
import { SelectorSonido } from '../features/sonidos/SelectorSonido.tsx'
import { PaginaVisitante, type ModoDeAcceso } from '../features/visitante/PaginaVisitante.tsx'
import type { EtapaArbol } from '../scene/EspacioVerde.tsx'
import { borrarSesion } from '../shared/api/sesion.ts'
import { useSesion } from '../shared/api/useSesion.ts'
import { Boton } from '../shared/ui/Boton.tsx'
import estilos from './App.module.css'
import { BancoEscena } from './BancoEscena.tsx'

type Pantalla = 'desahogo' | 'espacio-verde'

// TEMPORAL: la etapa real la calcula el backend (HU-07a) y se pedirá a la API cuando exista su contrato.
const ETAPA_TEMPORAL: EtapaArbol = 'tallo'

/**
 * Composición de la aplicación: aquí se unen las features, que no se conocen entre sí.
 * Sin sesión se ve la página de visitante; al registrarse o iniciar sesión (HU-02, HU-03a) la sesión queda abierta
 * y la app pasa sola a la pantalla de desahogo.
 */
function App() {
  const sesion = useSesion()
  const [modoDeAcceso, setModoDeAcceso] = useState<ModoDeAcceso>('registro')
  const [pantalla, setPantalla] = useState<Pantalla>('desahogo')

  if (import.meta.env.DEV && window.location.hash === '#escena') return <BancoEscena />

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
        controlesSonido={<SelectorSonido />}
        mostrarMetricas={import.meta.env.DEV}
      />
    )
  }

  function salir() {
    // Solo olvida el token en este navegador: la sesión sigue vigente en el servidor hasta que venza.
    borrarSesion()
    setPantalla('desahogo')
  }

  return (
    <main className={estilos.pantalla}>
      <div className={estilos.cabecera}>
        <h1 className={estilos.marca}>Treeve</h1>
        <p className={estilos.saludo}>Hola, {sesion.apodo}</p>
        <Boton variante="suave" onClick={salir}>
          Salir
        </Boton>
      </div>
      {pantalla === 'desahogo' ? (
        <FlujoDesahogo alGuardar={() => setPantalla('espacio-verde')} />
      ) : (
        <PantallaEspacioVerde etapa={ETAPA_TEMPORAL} regarAlEntrar onEscribirOtro={() => setPantalla('desahogo')} mostrarMetricas={import.meta.env.DEV} />
      )}
    </main>
  )
}

export default App
