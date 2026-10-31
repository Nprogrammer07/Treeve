import { useRef, useState } from 'react'
import { FlujoDesahogo } from '../features/desahogos/FlujoDesahogo.tsx'
import { PantallaEspacioVerde } from '../features/espacio-verde/PantallaEspacioVerde.tsx'
import { crecimientoEntre, textoDeCrecimiento } from '../features/espacio-verde/lote.ts'
import { useEspacioVerde } from '../features/espacio-verde/useEspacioVerde.ts'
import type { MotorSonido } from '../features/sonidos/motor.ts'
import { SelectorSonido } from '../features/sonidos/SelectorSonido.tsx'
import { VentanaSugerencias } from '../features/sugerencias/VentanaSugerencias.tsx'
import type { ControlEspacioVerde } from '../scene/EspacioVerde.tsx'

interface Props {
  apodo: string
  /** El motor de audio es de toda la app: el sonido sigue al pasar de la página de visitante a esta (HU-08). */
  motor: MotorSonido
  onSalir: () => void
}

/**
 * Todo lo que ve una persona con sesión: su espacio verde, el camino a desahogarse y las sugerencias.
 * Vive en su propio componente para que el lote solo se pida a la API cuando hay sesión, y para que al salir
 * todo (ventanas abiertas, avisos) se descarte solo.
 */
export function EspacioDeLaPersona({ apodo, motor, onSalir }: Props) {
  const { lote, cargando, fallo, recargar, reintentar } = useEspacioVerde()
  const [desahogoAbierto, setDesahogoAbierto] = useState(false)
  const [sugerenciasAbierto, setSugerenciasAbierto] = useState(false)
  const [aviso, setAviso] = useState('')
  const espacioVerde = useRef<ControlEspacioVerde>(null)

  async function alGuardar() {
    setDesahogoAbierto(false)
    setAviso('Tu desahogo regó tu espacio verde.')
    espacioVerde.current?.regar()
    // El desahogo ya quedó registrado como un riego: se pide el lote de nuevo y se compara con el de antes.
    // Cada 3 desahogos crece un componente (HU-07a): si algo subió de nivel, hay animación especial y aviso en palabras.
    const antes = lote
    const despues = await recargar()
    const creció = antes && despues ? crecimientoEntre(antes, despues) : null
    if (creció) {
      espacioVerde.current?.crecer()
      setAviso(`Tu desahogo regó tu espacio verde. ${textoDeCrecimiento(creció.componente, creció.nivel)}`)
    }
  }

  return (
    <>
      <PantallaEspacioVerde
        ref={espacioVerde}
        apodo={apodo}
        lote={lote}
        cargandoLote={cargando}
        falloLote={fallo}
        onReintentarLote={reintentar}
        aviso={aviso}
        controlesSonido={<SelectorSonido motor={motor} compacto />}
        onDesahogarme={() => {
          setAviso('')
          setDesahogoAbierto(true)
        }}
        onSugerir={() => setSugerenciasAbierto(true)}
        onSalir={onSalir}
        mostrarMetricas={import.meta.env.DEV}
      />
      <VentanaSugerencias abierto={sugerenciasAbierto} onCerrar={() => setSugerenciasAbierto(false)} />
      <FlujoDesahogo abierto={desahogoAbierto} onCerrar={() => setDesahogoAbierto(false)} alGuardar={() => void alGuardar()} />
    </>
  )
}
