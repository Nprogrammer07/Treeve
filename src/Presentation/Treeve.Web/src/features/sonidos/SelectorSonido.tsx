import { useEffect, useId, useState } from 'react'
import { Icono, type NombreIcono } from '../../shared/ui/Icono.tsx'
import { crearMotorSonido, type MotorSonido, type TipoSonido } from './motor.ts'
import { guardarVolumen, leerVolumen } from './preferencias.ts'
import estilos from './SelectorSonido.module.css'

const OPCIONES: { tipo: TipoSonido; etiqueta: string; icono: NombreIcono }[] = [
  { tipo: 'rio', etiqueta: 'Río', icono: 'gota' },
  { tipo: 'pajaros', etiqueta: 'Pájaros', icono: 'ave' },
  { tipo: 'lluvia', etiqueta: 'Lluvia', icono: 'lluvia' },
  { tipo: 'olas', etiqueta: 'Olas', icono: 'olas' },
  { tipo: 'bosque', etiqueta: 'Bosque', icono: 'bosque' },
]

interface Props {
  /** Solo para pruebas: permite sustituir el motor de audio. */
  motor?: MotorSonido
}

/**
 * HU-08: elegir un sonido de fondo. Empieza en silencio porque el navegador exige un gesto del usuario.
 * Pulsar otra vez el sonido activo lo detiene.
 */
export function SelectorSonido({ motor: motorExterno }: Props) {
  const idVolumen = useId()
  const [motor] = useState<MotorSonido>(() => motorExterno ?? crearMotorSonido())
  const [elegido, setElegido] = useState<TipoSonido | null>(null)
  const [volumen, setVolumen] = useState(leerVolumen)

  useEffect(() => {
    motor.fijarVolumen(volumen)
  }, [motor, volumen])

  useEffect(() => () => motor.detener(), [motor])

  function alternar(tipo: TipoSonido) {
    if (elegido === tipo) {
      setElegido(null)
      motor.detener()
    } else {
      setElegido(tipo)
      motor.reproducir(tipo)
    }
  }

  function cambiarVolumen(porcentaje: number) {
    const nuevo = porcentaje / 100
    setVolumen(nuevo)
    guardarVolumen(nuevo)
  }

  const activo = OPCIONES.find((o) => o.tipo === elegido)

  return (
    <fieldset className={estilos.tarjeta}>
      <legend className={estilos.visualmenteOculta}>Sonido ambiental</legend>
      <div className={estilos.cabecera} aria-hidden="true">
        <span className={estilos.titulo}>
          <Icono nombre="altavoz" tamano={18} />
          Sonido ambiental
        </span>
      </div>
      <output className={estilos.estado}>{activo ? `Sonando: ${activo.etiqueta}` : 'En silencio'}</output>
      <div className={estilos.opciones}>
        {OPCIONES.map(({ tipo, etiqueta, icono }) => (
          <button key={tipo} type="button" aria-pressed={elegido === tipo} onClick={() => alternar(tipo)} className={estilos.opcion}>
            <Icono nombre={icono} tamano={26} />
            {etiqueta}
          </button>
        ))}
      </div>
      <label htmlFor={idVolumen} className={estilos.volumen}>
        Volumen
        <input id={idVolumen} type="range" min={5} max={100} value={Math.round(volumen * 100)} onChange={(e) => cambiarVolumen(Number(e.target.value))} />
      </label>
    </fieldset>
  )
}
