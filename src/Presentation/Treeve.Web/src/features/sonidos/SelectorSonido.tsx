import { useEffect, useId, useState, useSyncExternalStore } from 'react'
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
  /**
   * El motor de audio. app/ crea uno solo y se lo da a todos los selectores, para que el sonido
   * no se corte al cambiar de pantalla (HU-08) y todos muestren el mismo estado.
   */
  motor?: MotorSonido
  /** Versión en una sola fila para el encabezado de la app. */
  compacto?: boolean
}

/**
 * HU-08: elegir un sonido de fondo. Empieza en silencio porque el navegador exige un gesto del usuario.
 * Pulsar otra vez el sonido activo lo detiene.
 */
export function SelectorSonido({ motor: motorExterno, compacto = false }: Props) {
  const idVolumen = useId()
  const [motor] = useState<MotorSonido>(() => motorExterno ?? crearMotorSonido())
  const elegido = useSyncExternalStore(motor.suscribirse, motor.leerActual)
  const [volumen, setVolumen] = useState(leerVolumen)

  useEffect(() => {
    motor.fijarVolumen(volumen)
  }, [motor, volumen])

  function alternar(tipo: TipoSonido) {
    if (elegido === tipo) motor.detener()
    else motor.reproducir(tipo)
  }

  function cambiarVolumen(porcentaje: number) {
    const nuevo = porcentaje / 100
    setVolumen(nuevo)
    guardarVolumen(nuevo)
  }

  const activo = OPCIONES.find((o) => o.tipo === elegido)

  return (
    <fieldset className={compacto ? `${estilos.tarjeta} ${estilos.compacto}` : estilos.tarjeta}>
      <legend className={estilos.visualmenteOculta}>Sonido ambiental</legend>
      <div className={estilos.cabecera} aria-hidden="true">
        <span className={estilos.titulo}>
          <Icono nombre="altavoz" tamano={18} />
          <span className={compacto ? estilos.visualmenteOculta : undefined}>Sonido ambiental</span>
        </span>
      </div>
      <output className={compacto ? estilos.visualmenteOculta : estilos.estado}>{activo ? `Sonando: ${activo.etiqueta}` : 'En silencio'}</output>
      <div className={estilos.opciones}>
        {OPCIONES.map(({ tipo, etiqueta, icono }) => (
          <button key={tipo} type="button" aria-pressed={elegido === tipo} onClick={() => alternar(tipo)} className={estilos.opcion}>
            <Icono nombre={icono} tamano={compacto ? 20 : 26} />
            <span className={compacto ? estilos.etiquetaCompacta : undefined}>{etiqueta}</span>
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
