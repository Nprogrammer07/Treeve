// Sonidos de fondo sintetizados con Web Audio: sin archivos de terceros ni licencias que registrar.

export const SONIDOS = ['rio', 'lluvia', 'olas', 'bosque', 'pajaros'] as const
export type TipoSonido = (typeof SONIDOS)[number]

export interface MotorSonido {
  reproducir: (tipo: TipoSonido) => void
  detener: () => void
  fijarVolumen: (volumen: number) => void
  /** Qué sonido está activo ahora (null = silencio). Permite que varios selectores muestren el mismo estado. */
  leerActual: () => TipoSonido | null
  suscribirse: (oyente: () => void) => () => void
}

type Parar = () => void

interface CapaRuido {
  color: 'blanco' | 'marron'
  filtros: { tipo: BiquadFilterType; frecuencia: number; q?: number }[]
  ganancia: number
  lfo?: { frecuencia: number; profundidad: number }
}

function bufferDeRuido(ctx: AudioContext, color: CapaRuido['color']): AudioBuffer {
  const largo = ctx.sampleRate * 2
  const buffer = ctx.createBuffer(1, largo, ctx.sampleRate)
  const datos = buffer.getChannelData(0)
  let ultimo = 0
  for (let i = 0; i < largo; i++) {
    const blanco = Math.random() * 2 - 1
    if (color === 'blanco') {
      datos[i] = blanco
    } else {
      ultimo = (ultimo + 0.02 * blanco) / 1.02
      datos[i] = ultimo * 3.5
    }
  }
  return buffer
}

function capaRuido(ctx: AudioContext, destino: AudioNode, capa: CapaRuido): Parar {
  const fuente = ctx.createBufferSource()
  fuente.buffer = bufferDeRuido(ctx, capa.color)
  fuente.loop = true
  const nodos: AudioNode[] = [fuente]
  let anterior: AudioNode = fuente
  for (const f of capa.filtros) {
    const filtro = ctx.createBiquadFilter()
    filtro.type = f.tipo
    filtro.frequency.value = f.frecuencia
    if (f.q !== undefined) filtro.Q.value = f.q
    anterior.connect(filtro)
    anterior = filtro
    nodos.push(filtro)
  }
  const ganancia = ctx.createGain()
  ganancia.gain.value = capa.ganancia
  anterior.connect(ganancia).connect(destino)
  nodos.push(ganancia)
  const osciladores: OscillatorNode[] = []
  if (capa.lfo) {
    const lfo = ctx.createOscillator()
    lfo.frequency.value = capa.lfo.frecuencia
    const profundidad = ctx.createGain()
    profundidad.gain.value = capa.lfo.profundidad
    lfo.connect(profundidad).connect(ganancia.gain)
    lfo.start()
    osciladores.push(lfo)
  }
  fuente.start()
  return () => {
    fuente.stop()
    for (const o of osciladores) o.stop()
    for (const n of nodos) n.disconnect()
  }
}

function gorjeos(ctx: AudioContext, destino: AudioNode, base: number, intervaloMs: [number, number], volumen: number): Parar {
  let temporizador: ReturnType<typeof setTimeout> | undefined
  function gorjeo() {
    const notas = 1 + Math.floor(Math.random() * 3)
    for (let i = 0; i < notas; i++) {
      const inicio = ctx.currentTime + i * 0.16
      const osc = ctx.createOscillator()
      const sobre = ctx.createGain()
      const frecuencia = base * (0.9 + Math.random() * 0.4)
      osc.frequency.setValueAtTime(frecuencia, inicio)
      osc.frequency.exponentialRampToValueAtTime(frecuencia * 1.5, inicio + 0.12)
      sobre.gain.setValueAtTime(0.0001, inicio)
      sobre.gain.exponentialRampToValueAtTime(volumen, inicio + 0.015)
      sobre.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.14)
      osc.connect(sobre).connect(destino)
      osc.start(inicio)
      osc.stop(inicio + 0.2)
    }
    const [min, max] = intervaloMs
    temporizador = setTimeout(gorjeo, min + Math.random() * (max - min))
  }
  temporizador = setTimeout(gorjeo, 200)
  return () => clearTimeout(temporizador)
}

const AMBIENTES: Record<TipoSonido, (ctx: AudioContext, destino: AudioNode) => Parar> = {
  rio: (ctx, d) =>
    capaRuido(ctx, d, {
      color: 'blanco',
      filtros: [
        { tipo: 'bandpass', frecuencia: 900, q: 0.5 },
        { tipo: 'lowpass', frecuencia: 3000 },
      ],
      ganancia: 0.5,
      lfo: { frecuencia: 0.3, profundidad: 0.08 },
    }),
  lluvia: (ctx, d) =>
    capaRuido(ctx, d, {
      color: 'blanco',
      filtros: [
        { tipo: 'highpass', frecuencia: 700 },
        { tipo: 'lowpass', frecuencia: 9000 },
      ],
      ganancia: 0.35,
    }),
  olas: (ctx, d) =>
    capaRuido(ctx, d, {
      color: 'marron',
      filtros: [{ tipo: 'lowpass', frecuencia: 900 }],
      ganancia: 0.6,
      lfo: { frecuencia: 0.12, profundidad: 0.45 },
    }),
  bosque: (ctx, d) => {
    const viento = capaRuido(ctx, d, { color: 'marron', filtros: [{ tipo: 'lowpass', frecuencia: 400 }], ganancia: 0.35 })
    const aves = gorjeos(ctx, d, 2200, [2500, 6000], 0.05)
    return () => {
      viento()
      aves()
    }
  },
  pajaros: (ctx, d) => {
    const brisa = capaRuido(ctx, d, { color: 'marron', filtros: [{ tipo: 'lowpass', frecuencia: 300 }], ganancia: 0.1 })
    const aves = gorjeos(ctx, d, 2800, [600, 2200], 0.12)
    return () => {
      brisa()
      aves()
    }
  },
}

export function crearMotorSonido(): MotorSonido {
  let ctx: AudioContext | null = null
  let maestro: GainNode | null = null
  let parar: Parar | null = null
  let volumen = 0.6
  let actual: TipoSonido | null = null
  const oyentes = new Set<() => void>()

  function cambiarA(tipo: TipoSonido | null) {
    actual = tipo
    for (const oyente of oyentes) oyente()
  }

  function detener() {
    parar?.()
    parar = null
    cambiarA(null)
  }

  return {
    reproducir(tipo) {
      // El AudioContext se crea aquí, dentro del gesto del usuario: los navegadores bloquean el audio automático.
      ctx ??= new AudioContext()
      if (!maestro) {
        maestro = ctx.createGain()
        maestro.gain.value = volumen
        maestro.connect(ctx.destination)
      }
      void ctx.resume()
      detener()
      parar = AMBIENTES[tipo](ctx, maestro)
      cambiarA(tipo)
    },
    detener,
    leerActual: () => actual,
    suscribirse(oyente) {
      oyentes.add(oyente)
      return () => {
        oyentes.delete(oyente)
      }
    },
    fijarVolumen(nuevo) {
      volumen = nuevo
      if (maestro) maestro.gain.value = nuevo
    },
  }
}
