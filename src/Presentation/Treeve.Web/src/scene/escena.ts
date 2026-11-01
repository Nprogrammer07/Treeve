import { Application, Graphics } from 'pixi.js'
import {
  arbolesDelBosque,
  casillas,
  disenarMapa,
  escalaDelArbol,
  floresDelLote,
  formaArbol,
  poligonoAgua,
  poligonoArena,
  posicionPajaro,
  rocas,
  romboSuelo,
  type EtapaArbol,
  type Mapa,
} from './geometria.ts'

export interface Metricas {
  fps: number
  cargaMs: number
}

export interface OpcionesEscena {
  /** Etapa del árbol (brote, tallo, flor o árbol adulto). */
  etapa: EtapaArbol
  /** Nivel del componente "flores" (1 a 4). */
  nivelFlores: number
  /** Nivel del componente "bosque" (1 a 4). */
  nivelBosque: number
  pajaros: boolean
  reducirMovimiento: boolean
  onMetricas?: (metricas: Metricas) => void
}

const AVES = 4
const DURACION_PULSO_MS = 900
const TONOS_DE_FLOR = [0xf4a9bd, 0xf6d365, 0xffffff, 0xc9a7e8] as const

// Paleta propia de Treeve: verdes vivos y amables, de estilo isométrico para juego móvil.
const COLORES = {
  pastoExterior: 0x5ea334,
  borde: 0x4c9428,
  cesped: 0x8fd14a,
  casillaClara: 0xb9e76e,
  casillaOscura: 0x8fcd46,
  lineaTablero: 0xc7ec82,
  arena: 0xe6cb8e,
  agua: 0x4aa6e0,
  aguaClara: 0x86cdf2,
  roca: 0x8c8f96,
  rocaLuz: 0xb7bac1,
  sombra: 0x1f4a17,
  tronco: 0x8a5a2b,
  troncoSombra: 0x6e4620,
} as const

// Tres variantes de copa para el bosque: oscuro, medio y luz.
const COPAS: readonly (readonly [number, number, number])[] = [
  [0x2f7d2a, 0x44a237, 0x6fcb4b],
  [0x358a2c, 0x4eb03b, 0x7ad553],
  [0x2a7326, 0x3c9833, 0x63bf45],
]

const aplanar = (puntos: readonly { x: number; y: number }[]): number[] => puntos.flatMap((p) => [p.x, p.y])

/** Único lugar que habla con PixiJS. No contiene reglas de negocio: solo dibuja la etapa que recibe. */
export class Escena {
  private readonly app = new Application()
  private readonly suelo = new Graphics()
  private readonly bosque = new Graphics()
  private readonly arbol = new Graphics()
  private readonly lluvia = new Graphics()
  private readonly brillo = new Graphics()
  private readonly aves: Graphics[] = []
  private destellos: { x: number; y: number; vx: number; vy: number; vida: number; vidaInicial: number; radio: number }[] = []
  private mapa: Mapa | null = null
  private amplitudDelPulso = 0.06
  private crecimientoPendiente = false
  private gotas: { x: number; y: number; vy: number }[] = []
  private yTierra = 0
  private pulsoRestante = 0
  private acumuladoMs = 0
  private cuadros = 0
  private cargaMs = 0
  private listo = false
  private riegoPendiente = false
  private redibujoPendiente = false
  private destruida = false

  private opciones: OpcionesEscena

  constructor(opciones: OpcionesEscena) {
    this.opciones = opciones
  }

  async iniciar(anfitrion: HTMLElement): Promise<void> {
    const inicio = performance.now()
    await this.app.init({
      resizeTo: anfitrion,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    })
    if (this.destruida) {
      this.app.destroy(true, { children: true })
      return
    }
    anfitrion.appendChild(this.app.canvas)
    this.app.stage.addChild(this.suelo, this.bosque, this.arbol, this.brillo, this.lluvia)
    for (let i = 0; i < AVES; i++) {
      const ave = new Graphics()
      this.aves.push(ave)
      this.app.stage.addChild(ave)
    }
    this.app.renderer.on('resize', () => this.pedirRedibujo())
    this.listo = true
    this.dibujarEstatico()
    this.app.ticker.add(() => this.animar())
    this.cargaMs = Math.round(performance.now() - inicio)
    this.opciones.onMetricas?.({ fps: 0, cargaMs: this.cargaMs })
    if (this.riegoPendiente) {
      this.riegoPendiente = false
      this.regar()
    }
    if (this.crecimientoPendiente) {
      this.crecimientoPendiente = false
      this.crecer()
    }
  }

  /** Crecimiento del lote (un componente subió de nivel): destellos que salen del árbol y un latido más grande. */
  crecer(): void {
    if (!this.listo || !this.mapa) {
      // Se pidió antes de que la escena terminara de cargar: ocurre en cuanto esté lista.
      this.crecimientoPendiente = true
      return
    }
    if (this.opciones.reducirMovimiento) return
    const { cx, cy, a } = this.mapa
    this.destellos = Array.from({ length: 30 }, (_, i) => {
      const angulo = (i / 30) * Math.PI * 2 + Math.random() * 0.3
      const rapidez = 0.05 + Math.random() * 0.1
      const vida = 1100 + Math.random() * 600
      return { x: cx, y: cy - a * 0.18, vx: Math.cos(angulo) * rapidez, vy: Math.sin(angulo) * rapidez * 0.55 - 0.04, vida, vidaInicial: vida, radio: 3 + Math.random() * 3.5 }
    })
    this.amplitudDelPulso = 0.13
    this.pulsoRestante = DURACION_PULSO_MS
  }

  actualizar(cambios: Partial<Pick<OpcionesEscena, 'etapa' | 'pajaros' | 'nivelFlores' | 'nivelBosque'>>): void {
    this.opciones = { ...this.opciones, ...cambios }
    if (this.listo) this.dibujarEstatico()
  }

  /** Animación de riego: gotas sobre la copa y un pequeño latido del árbol. */
  regar(): void {
    if (!this.listo) {
      // Se pidió regar antes de que la escena terminara de cargar: se riega en cuanto esté lista.
      this.riegoPendiente = true
      return
    }
    if (this.opciones.reducirMovimiento) return
    const { width } = this.app.screen
    const copa = formaArbol(this.opciones.etapa).radioCopa || 20
    this.gotas = Array.from({ length: 36 }, () => ({
      x: width / 2 + (Math.random() - 0.5) * copa * 2.4,
      y: -Math.random() * 80,
      vy: 0.35 + Math.random() * 0.25,
    }))
    this.amplitudDelPulso = 0.06
    this.pulsoRestante = DURACION_PULSO_MS
  }

  destruir(): void {
    this.destruida = true
    if (this.listo) this.app.destroy(true, { children: true })
  }

  /** Al cambiar de tamaño llegan muchos eventos seguidos: el terreno se vuelve a dibujar una sola vez por cuadro. */
  private pedirRedibujo(): void {
    if (this.redibujoPendiente) return
    this.redibujoPendiente = true
    requestAnimationFrame(() => {
      this.redibujoPendiente = false
      if (!this.destruida) this.dibujarEstatico()
    })
  }

  private dibujarEstatico(): void {
    const { width: ancho, height: alto } = this.app.screen
    const mapa = disenarMapa(ancho, alto)
    this.mapa = mapa
    this.yTierra = mapa.cy
    this.dibujarTerreno(ancho, alto, mapa)
    this.dibujarBosque(ancho, alto, mapa)
    this.dibujarArbol(mapa.cx, mapa.cy, escalaDelArbol(mapa))
    this.dibujarAves(0)
  }

  /** Pasto, costa con rocas, borde y césped en cuadrícula. Todo estático: se dibuja una vez, no en cada cuadro. */
  private dibujarTerreno(ancho: number, alto: number, mapa: Mapa): void {
    const g = this.suelo.clear()
    g.rect(0, 0, ancho, alto).fill(COLORES.pastoExterior)

    // Costa: arena, agua, ondas y rocas. Se pinta antes del césped, que tapa lo que se le cruce.
    g.poly(aplanar(poligonoArena(ancho, alto))).fill(COLORES.arena)
    g.poly(aplanar(poligonoAgua(ancho, alto))).fill(COLORES.agua)
    for (const [x0, x1, y] of [
      [0.04, 0.09, 0.72],
      [0.07, 0.14, 0.84],
      [0.02, 0.1, 0.93],
    ] as const) {
      g.moveTo(x0 * ancho, y * alto).lineTo(x1 * ancho, y * alto).stroke({ width: 2.5, color: COLORES.aguaClara, alpha: 0.8, cap: 'round' })
    }
    for (const roca of rocas(ancho, alto)) {
      g.ellipse(roca.x, roca.y + roca.radio * 0.3, roca.radio * 1.1, roca.radio * 0.6).fill({ color: COLORES.sombra, alpha: 0.25 })
      g.ellipse(roca.x, roca.y, roca.radio, roca.radio * 0.75).fill(COLORES.roca)
      g.ellipse(roca.x - roca.radio * 0.25, roca.y - roca.radio * 0.25, roca.radio * 0.5, roca.radio * 0.3).fill(COLORES.rocaLuz)
    }

    // Césped: un borde más oscuro, el rombo y encima el tablero de casillas claras y oscuras.
    g.poly(aplanar(Object.values(romboSuelo(mapa.cx, mapa.cy, mapa.a * 1.05)))).fill(COLORES.borde)
    g.poly(aplanar(Object.values(romboSuelo(mapa.cx, mapa.cy, mapa.a)))).fill(COLORES.cesped)
    for (const casilla of casillas(mapa)) g.poly(casilla.puntos).fill(casilla.claro ? COLORES.casillaClara : COLORES.casillaOscura)
    g.poly(aplanar(Object.values(romboSuelo(mapa.cx, mapa.cy, mapa.n * mapa.tw)))).stroke({ width: 2, color: COLORES.lineaTablero, alpha: 0.9 })

    // Flores sobre el césped: cuántas depende del nivel del componente "flores".
    for (const flor of floresDelLote(mapa, this.opciones.nivelFlores)) {
      g.ellipse(flor.x, flor.y + flor.radio * 0.6, flor.radio * 1.1, flor.radio * 0.45).fill({ color: COLORES.sombra, alpha: 0.2 })
      g.circle(flor.x, flor.y, flor.radio).fill(TONOS_DE_FLOR[flor.tono])
      g.circle(flor.x, flor.y, flor.radio * 0.42).fill(flor.tono === 1 ? 0xffffff : 0xf6c445)
    }
  }

  /** Bosque denso en los bordes: copas redondas en tres verdes, con sombra, pintadas de atrás hacia adelante. */
  private dibujarBosque(ancho: number, alto: number, mapa: Mapa): void {
    const g = this.bosque.clear()
    for (const arbol of arbolesDelBosque(ancho, alto, mapa, this.opciones.nivelBosque)) {
      const [oscuro, medio, luz] = COPAS[arbol.tono] ?? COPAS[0] ?? [0x2f7d2a, 0x44a237, 0x6fcb4b]
      const r = arbol.radio
      g.ellipse(arbol.x + r * 0.1, arbol.y + r * 0.75, r * 0.95, r * 0.35).fill({ color: COLORES.sombra, alpha: 0.3 })
      g.circle(arbol.x, arbol.y, r).fill(oscuro)
      g.circle(arbol.x - r * 0.12, arbol.y - r * 0.18, r * 0.8).fill(medio)
      g.circle(arbol.x - r * 0.28, arbol.y - r * 0.38, r * 0.42).fill(luz)
    }
  }

  private dibujarArbol(cx: number, cy: number, escala: number): void {
    const f = formaArbol(this.opciones.etapa)
    const g = this.arbol.clear()
    this.arbol.pivot.set(cx, cy)
    this.arbol.position.set(cx, cy)
    const h = f.alturaTronco * escala
    const grosor = f.grosorTronco * escala
    const r = f.radioCopa * escala
    g.ellipse(cx, cy + 3 * escala, r * 0.9, r * 0.32).fill({ color: COLORES.sombra, alpha: 0.3 })
    g.poly([cx - grosor / 2, cy, cx + grosor / 2, cy, cx + grosor * 0.35, cy - h, cx - grosor * 0.35, cy - h]).fill(COLORES.tronco)
    g.poly([cx, cy, cx + grosor / 2, cy, cx + grosor * 0.35, cy - h, cx, cy - h]).fill(COLORES.troncoSombra)
    const centroY = cy - h - r * 0.35
    const desplazamientos = [
      [-0.55, 0.35, 0.75],
      [0.55, 0.3, 0.75],
      [0, 0, 1],
    ] as const
    const usados = f.copas === 1 ? desplazamientos.slice(2) : desplazamientos
    for (const [dx, dy, k] of usados) g.circle(cx + dx * r, centroY + dy * r, r * k).fill(0x2f8f2a)
    for (const [dx, dy, k] of usados) g.circle(cx + dx * r - r * 0.08, centroY + dy * r - r * 0.1, r * k * 0.85).fill(0x45b238)
    g.circle(cx - r * 0.25, centroY - r * 0.3, r * 0.5).fill(0x7bd44c)
    // Flores sobre la copa (etapa "flor"): pétalos rosados con centro amarillo.
    const lugares = [
      [-0.55, -0.1],
      [0.5, -0.35],
      [0.1, 0.4],
      [-0.2, -0.7],
      [0.65, 0.15],
      [-0.7, 0.35],
    ] as const
    for (const [dx, dy] of lugares.slice(0, f.flores)) {
      g.circle(cx + dx * r, centroY + dy * r, r * 0.13).fill(0xf4a9bd)
      g.circle(cx + dx * r, centroY + dy * r, r * 0.055).fill(0xf6d365)
    }
  }

  private dibujarAves(ms: number): void {
    const { width, height } = this.app.screen
    this.aves.forEach((ave, i) => {
      ave.clear()
      if (!this.opciones.pajaros) return
      const p = posicionPajaro(ms, i, width, height)
      const a = 4 * p.aleteo
      ave.moveTo(-9, -a).lineTo(0, 0).lineTo(9, -a).stroke({ width: 2, color: 0x2e3d34, cap: 'round', join: 'round' })
      ave.position.set(p.x, p.y)
    })
  }

  private animar(): void {
    const dt = this.app.ticker.deltaMS
    this.cuadros++
    this.acumuladoMs += dt
    if (this.acumuladoMs >= 500) {
      this.opciones.onMetricas?.({ fps: Math.round((this.cuadros * 1000) / this.acumuladoMs), cargaMs: this.cargaMs })
      this.cuadros = 0
      this.acumuladoMs = 0
    }
    if (this.opciones.reducirMovimiento) return
    this.dibujarAves(performance.now())
    this.animarRiego(dt)
    this.animarDestellos(dt)
  }

  private animarDestellos(dt: number): void {
    this.destellos = this.destellos.filter((d) => d.vida > 0)
    this.brillo.clear()
    for (const d of this.destellos) {
      d.vida -= dt
      d.x += d.vx * dt
      d.y += d.vy * dt
      const intensidad = Math.max(0, d.vida / d.vidaInicial)
      // Estrella de cuatro puntas que se apaga al final de su vida.
      const r = d.radio * (0.5 + intensidad)
      this.brillo.poly([d.x, d.y - r * 1.6, d.x + r * 0.45, d.y - r * 0.45, d.x + r * 1.6, d.y, d.x + r * 0.45, d.y + r * 0.45, d.x, d.y + r * 1.6, d.x - r * 0.45, d.y + r * 0.45, d.x - r * 1.6, d.y, d.x - r * 0.45, d.y - r * 0.45]).fill({ color: 0xfff1a8, alpha: intensidad })
    }
  }

  private animarRiego(dt: number): void {
    this.gotas = this.gotas.filter((gota) => gota.y < this.yTierra - 20)
    for (const gota of this.gotas) gota.y += gota.vy * dt
    this.lluvia.clear()
    for (const gota of this.gotas) this.lluvia.circle(gota.x, gota.y, 2.2).fill(0x6fa8dc)
    if (this.pulsoRestante > 0) {
      this.pulsoRestante = Math.max(0, this.pulsoRestante - dt)
      const avance = 1 - this.pulsoRestante / DURACION_PULSO_MS
      this.arbol.scale.set(1 + this.amplitudDelPulso * Math.sin(Math.PI * avance))
    }
  }
}
