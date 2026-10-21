import { Application, Graphics } from 'pixi.js'
import { formaArbol, posicionPajaro, romboSuelo, type EtapaArbol } from './geometria.ts'

export interface Metricas {
  fps: number
  cargaMs: number
}

export interface OpcionesEscena {
  etapa: EtapaArbol
  pajaros: boolean
  reducirMovimiento: boolean
  onMetricas?: (metricas: Metricas) => void
}

const AVES = 4
const DURACION_PULSO_MS = 900

/** Único lugar que habla con PixiJS. No contiene reglas de negocio: solo dibuja la etapa que recibe. */
export class Escena {
  private readonly app = new Application()
  private readonly suelo = new Graphics()
  private readonly arbol = new Graphics()
  private readonly lluvia = new Graphics()
  private readonly aves: Graphics[] = []
  private gotas: { x: number; y: number; vy: number }[] = []
  private yTierra = 0
  private pulsoRestante = 0
  private acumuladoMs = 0
  private cuadros = 0
  private cargaMs = 0
  private listo = false
  private riegoPendiente = false
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
    this.app.stage.addChild(this.suelo, this.arbol, this.lluvia)
    for (let i = 0; i < AVES; i++) {
      const ave = new Graphics()
      this.aves.push(ave)
      this.app.stage.addChild(ave)
    }
    this.app.renderer.on('resize', () => this.dibujarEstatico())
    this.listo = true
    this.dibujarEstatico()
    this.app.ticker.add(() => this.animar())
    this.cargaMs = Math.round(performance.now() - inicio)
    this.opciones.onMetricas?.({ fps: 0, cargaMs: this.cargaMs })
    if (this.riegoPendiente) {
      this.riegoPendiente = false
      this.regar()
    }
  }

  actualizar(cambios: Partial<Pick<OpcionesEscena, 'etapa' | 'pajaros'>>): void {
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
    this.pulsoRestante = DURACION_PULSO_MS
  }

  destruir(): void {
    this.destruida = true
    if (this.listo) this.app.destroy(true, { children: true })
  }

  private dibujarEstatico(): void {
    const { width: ancho, height: alto } = this.app.screen
    const a = Math.min(ancho * 0.42, alto * 0.5)
    const cx = ancho / 2
    const cy = alto * 0.62
    const escala = a / 200
    this.yTierra = cy
    this.dibujarSuelo(cx, cy, a, escala)
    this.dibujarArbol(cx, cy, escala)
    this.dibujarAves(0)
  }

  private dibujarSuelo(cx: number, cy: number, a: number, escala: number): void {
    const r = romboSuelo(cx, cy, a)
    const grosor = 14 * escala
    const g = this.suelo.clear()
    g.poly([r.izquierda.x, r.izquierda.y, r.abajo.x, r.abajo.y, r.abajo.x, r.abajo.y + grosor, r.izquierda.x, r.izquierda.y + grosor]).fill(0x6b9a5e)
    g.poly([r.derecha.x, r.derecha.y, r.abajo.x, r.abajo.y, r.abajo.x, r.abajo.y + grosor, r.derecha.x, r.derecha.y + grosor]).fill(0x5c8a52)
    g.poly([r.arriba.x, r.arriba.y, r.derecha.x, r.derecha.y, r.abajo.x, r.abajo.y, r.izquierda.x, r.izquierda.y]).fill(0x8dbb7a)
    for (let i = 0; i < 14; i++) {
      const u = ((i * 37) % 100) / 100
      const v = ((i * 61) % 100) / 100
      const x = cx + (u - v) * a * 0.8
      const y = cy + (u + v - 1) * a * 0.4
      g.poly([x - 3 * escala, y, x, y - 8 * escala, x + 3 * escala, y]).fill(0x6fa466)
    }
  }

  private dibujarArbol(cx: number, cy: number, escala: number): void {
    const f = formaArbol(this.opciones.etapa)
    const g = this.arbol.clear()
    this.arbol.pivot.set(cx, cy)
    this.arbol.position.set(cx, cy)
    if (f.copas === 0) {
      g.ellipse(cx, cy, 9 * escala, 4 * escala).fill(0x7a5a3a)
      g.ellipse(cx, cy - 2 * escala, 4 * escala, 2 * escala).fill(0x5a4128)
      return
    }
    const h = f.alturaTronco * escala
    const grosor = f.grosorTronco * escala
    const r = f.radioCopa * escala
    g.ellipse(cx, cy + 3 * escala, r * 0.9, r * 0.32).fill({ color: 0x24332b, alpha: 0.18 })
    g.poly([cx - grosor / 2, cy, cx + grosor / 2, cy, cx + grosor * 0.35, cy - h, cx - grosor * 0.35, cy - h]).fill(0x7a5a3a)
    g.poly([cx, cy, cx + grosor / 2, cy, cx + grosor * 0.35, cy - h, cx, cy - h]).fill(0x6a4c30)
    const centroY = cy - h - r * 0.35
    const desplazamientos = [
      [-0.55, 0.35, 0.75],
      [0.55, 0.3, 0.75],
      [0, 0, 1],
    ] as const
    const usados = f.copas === 1 ? desplazamientos.slice(2) : desplazamientos
    for (const [dx, dy, k] of usados) g.circle(cx + dx * r, centroY + dy * r, r * k).fill(0x4a8a56)
    for (const [dx, dy, k] of usados) g.circle(cx + dx * r - r * 0.08, centroY + dy * r - r * 0.1, r * k * 0.85).fill(0x5ea068)
    g.circle(cx - r * 0.25, centroY - r * 0.3, r * 0.5).fill(0x78b97a)
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
  }

  private animarRiego(dt: number): void {
    this.gotas = this.gotas.filter((gota) => gota.y < this.yTierra - 20)
    for (const gota of this.gotas) gota.y += gota.vy * dt
    this.lluvia.clear()
    for (const gota of this.gotas) this.lluvia.circle(gota.x, gota.y, 2.2).fill(0x6fa8dc)
    if (this.pulsoRestante > 0) {
      this.pulsoRestante = Math.max(0, this.pulsoRestante - dt)
      const avance = 1 - this.pulsoRestante / DURACION_PULSO_MS
      this.arbol.scale.set(1 + 0.06 * Math.sin(Math.PI * avance))
    }
  }
}
