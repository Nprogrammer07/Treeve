import { FormularioLogin } from '../features/identidad/FormularioLogin.tsx'
import { Boton } from '../shared/ui/Boton.tsx'
import { Icono } from '../shared/ui/Icono.tsx'
import estilos from './AccesoDeStaff.module.css'

/** HU-10: pantalla para iniciar sesión en la zona de staff (/staff). Es la misma cuenta; el rol lo decide la API. */
export function AccesoDeStaff({ onVolver }: { onVolver: () => void }) {
  return (
    <main className={estilos.pagina}>
      <h1 className={estilos.titulo}>
        <Icono nombre="escudo" tamano={26} />
        Acceso del equipo
      </h1>
      <p className={estilos.texto}>Entra con tu cuenta. Solo el equipo de Treeve puede ver este panel.</p>
      <div className={estilos.tarjeta}>
        <FormularioLogin />
      </div>
      <Boton variante="suave" onClick={onVolver}>
        Volver a Treeve
      </Boton>
    </main>
  )
}
