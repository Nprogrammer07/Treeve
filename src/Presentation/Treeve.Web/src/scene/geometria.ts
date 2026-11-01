// Geometría pura de la escena (sin PixiJS): se prueba sin navegador.

export const ETAPAS = ['brote', 'tallo', 'flor', 'arbol-adulto'] as const

/**
 * Etapas del árbol definidas en el proyecto (CLAUDE.md): brote → tallo → flor → árbol adulto.
 * La etapa la calcula el backend (HU-07a); los identificadores exactos se alinean con su contrato cuando exista.
 */
export type EtapaArbol = (typeof ETAPAS)[number]

export interface FormaArbol {
  alturaTronco: number
  grosorTronco: number
  radioCopa: number
  copas: number
  flores: number
}

const FORMAS: Record<EtapaArbol, FormaArbol> = {
  brote: { alturaTronco: 22, grosorTronco: 4, radioCopa: 14, copas: 1, flores: 0 },
  tallo: { alturaTronco: 46, grosorTronco: 6, radioCopa: 30, copas: 1, flores: 0 },
  flor: { alturaTronco: 62, grosorTronco: 8, radioCopa: 42, copas: 1, flores: 6 },
  'arbol-adulto': { alturaTronco: 78, grosorTronco: 10, radioCopa: 58, copas: 3, flores: 0 },
}

export function formaArbol(etapa: EtapaArbol): FormaArbol {
  return FORMAS[etapa]
}

export interface Punto {
  x: number
  y: number
}

/** Rombo isométrico 2:1 centrado en (cx, cy) con semiancho `a`. */
export function romboSuelo(cx: number, cy: number, a: number) {
  return {
    arriba: { x: cx, y: cy - a / 2 },
    derecha: { x: cx + a, y: cy },
    abajo: { x: cx, y: cy + a / 2 },
    izquierda: { x: cx - a, y: cy },
  }
}

/** Posición y aleteo de un pájaro en el instante `ms`. Siempre dentro del área visible. */
export function posicionPajaro(ms: number, indice: number, ancho: number, alto: number) {
  const fase = indice * 1.7
  const velocidad = 0.00018 + indice * 0.00004
  return {
    x: ancho * (0.5 + 0.38 * Math.sin(ms * velocidad + fase)),
    y: alto * (0.2 + 0.08 * Math.sin(ms * 0.0006 + fase) + indice * 0.03),
    aleteo: Math.sin(ms * 0.012 + fase),
  }
}

// ---------- Mapa isométrico: césped en cuadrícula, bosque en los bordes y costa en una esquina ----------

export interface Mapa {
  cx: number
  cy: number
  /** Semiancho del rombo del césped (su semialto es a / 2: proyección isométrica 2:1). */
  a: number
  /** El tablero de casillas es de n × n. */
  n: number
  /** Semiancho de una casilla. */
  tw: number
}

/** Coloca el rombo del césped dentro del lienzo, dejando sus cuatro esquinas libres para el bosque y la costa. */
export function disenarMapa(ancho: number, alto: number): Mapa {
  const a = Math.min(ancho * 0.46, alto * 0.9)
  const n = 8
  return { cx: ancho / 2, cy: alto * 0.52, a, n, tw: (a * 0.6) / n }
}

/** Tamaño del árbol de la persona respecto al mapa: es el protagonista, así que se ve grande sobre el tablero. */
export function escalaDelArbol(mapa: Mapa): number {
  return mapa.a / 340
}

/** ¿El punto cae dentro del rombo del césped? `margen` > 1 agranda el rombo. */
export function dentroDelCesped(x: number, y: number, mapa: Mapa, margen = 1): boolean {
  return Math.abs(x - mapa.cx) / (mapa.a * margen) + Math.abs(y - mapa.cy) / ((mapa.a / 2) * margen) <= 1
}

/** Los tres componentes del lote (árbol, flores y bosque) tienen niveles del 1 al 4 (HU-07a, ADR-007). */
export const NIVEL_MAXIMO = 4

const limitarNivel = (nivel: number): number => Math.min(NIVEL_MAXIMO, Math.max(1, Math.round(nivel)))

/** Qué parte del bosque completo ya creció en cada nivel. */
const FRACCION_DEL_BOSQUE = [0.22, 0.5, 0.78, 1] as const

export function fraccionDelBosque(nivel: number): number {
  return FRACCION_DEL_BOSQUE[limitarNivel(nivel) - 1] ?? 1
}

export interface Casilla {
  /** Vértices x, y, x, y… del rombo de la casilla. */
  puntos: number[]
  /** Las casillas se alternan claras y oscuras, como un tablero. */
  claro: boolean
}

export function casillas(mapa: Mapa): Casilla[] {
  const { cx, cy, n, tw } = mapa
  const lista: Casilla[] = []
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const u = i - (n - 1) / 2
      const v = j - (n - 1) / 2
      const x = cx + (u - v) * tw
      const y = cy + ((u + v) * tw) / 2
      lista.push({ puntos: [x, y - tw / 2, x + tw, y, x, y + tw / 2, x - tw, y], claro: (i + j) % 2 === 0 })
    }
  }
  return lista
}

// La costa se describe en proporciones del lienzo (x, y de 0 a 1) para que se adapte a cualquier tamaño.
const COSTA: readonly (readonly [number, number])[] = [
  [0, 0.58],
  [0.07, 0.64],
  [0.12, 0.72],
  [0.15, 0.82],
  [0.2, 0.92],
  [0.26, 1],
  [0, 1],
]

/** El agua ocupa la esquina inferior izquierda. */
export function poligonoAgua(ancho: number, alto: number): Punto[] {
  return COSTA.map(([fx, fy]) => ({ x: fx * ancho, y: fy * alto }))
}

/** La orilla de arena es el agua un poco más grande, vista desde la esquina. */
export function poligonoArena(ancho: number, alto: number): Punto[] {
  return COSTA.map(([fx, fy]) => ({ x: fx * ancho * 1.18, y: alto + (fy * alto - alto) * 1.18 }))
}

export interface Roca {
  x: number
  y: number
  radio: number
}

/** Rocas sobre la orilla de arena, del lado del césped. */
export function rocas(ancho: number, alto: number): Roca[] {
  const orilla = poligonoArena(ancho, alto).slice(1, 6)
  const radio = Math.min(12, Math.max(5, ancho * 0.012))
  return orilla.flatMap((p, i) => [
    { x: p.x, y: p.y, radio },
    { x: p.x + radio * 1.6, y: p.y - radio * (i % 2 === 0 ? 0.9 : -0.4), radio: radio * 0.6 },
  ])
}

/** Ray casting: ¿el punto está dentro del polígono? */
export function puntoEnPoligono(x: number, y: number, poligono: Punto[]): boolean {
  let dentro = false
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const a = poligono[i]
    const b = poligono[j]
    if (!a || !b) continue
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) dentro = !dentro
  }
  return dentro
}

/** Ruido determinista entre 0 y 1: el bosque se ve igual cada vez que se dibuja. */
function ruido(i: number, j: number, k: number): number {
  const v = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453
  return v - Math.floor(v)
}

export interface ArbolDelBosque {
  x: number
  y: number
  radio: number
  /** Cuál de las tres variantes de verde usa. */
  tono: 0 | 1 | 2
}

/**
 * Árboles del bosque según su nivel (1 a 4): densos, fuera del césped y lejos del agua. Salen ordenados de atrás hacia adelante
 * (de menor a mayor y), que es el orden en que hay que pintarlos para que los de adelante tapen a los de atrás.
 */
export function arbolesDelBosque(ancho: number, alto: number, mapa: Mapa, nivel: number = NIVEL_MAXIMO): ArbolDelBosque[] {
  const fraccion = fraccionDelBosque(nivel)
  const paso = Math.max(mapa.a * 0.11, 22)
  const arena = poligonoArena(ancho, alto)
  const filas = Math.ceil(alto / (paso * 0.7)) + 2
  const columnas = Math.ceil(ancho / paso) + 2
  const arboles: ArbolDelBosque[] = []
  for (let j = -1; j < filas; j++) {
    for (let i = -1; i < columnas; i++) {
      const x = (i + (j % 2 === 0 ? 0 : 0.5)) * paso + (ruido(i, j, 1) - 0.5) * paso * 0.6
      const y = j * paso * 0.7 + (ruido(i, j, 2) - 0.5) * paso * 0.5
      if (dentroDelCesped(x, y, mapa, 1.06) || puntoEnPoligono(x, y, arena) || ruido(i, j, 3) > 0.9) continue
      // Un árbol que aparece en un nivel sigue estando en los siguientes: el bosque solo crece, nunca pierde árboles.
      if (ruido(i, j, 6) > fraccion) continue
      const tono = Math.min(2, Math.floor(ruido(i, j, 4) * 3)) as 0 | 1 | 2
      arboles.push({ x, y, radio: paso * (0.55 + ruido(i, j, 5) * 0.35), tono })
    }
  }
  return arboles.sort((p, q) => p.y - q.y)
}

// ---------- Flores sobre el césped ----------

/** Cuántas flores hay en cada nivel del componente "flores". */
const FLORES_POR_NIVEL = [5, 11, 19, 28] as const

export interface FlorDelLote {
  x: number
  y: number
  radio: number
  /** Cuál de los cuatro colores usa: rosa, amarillo, blanco o lila. */
  tono: 0 | 1 | 2 | 3
}

/**
 * Flores del lote según el nivel de "flores" (1 a 4): puntos fijos sobre las casillas, siempre los mismos.
 * Las del nivel siguiente se suman a las anteriores (ninguna desaparece) y ninguna cae junto al árbol de la persona.
 */
export function floresDelLote(mapa: Mapa, nivel: number): FlorDelLote[] {
  const { cx, cy, n, tw } = mapa
  const candidatas: (FlorDelLote & { orden: number })[] = []
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const u = i - (n - 1) / 2
      const v = j - (n - 1) / 2
      if (u * u + v * v < 2) continue
      // Un punto cualquiera dentro del rombo de la casilla (|a| + |b| ≤ 0,8).
      const a = (ruido(i, j, 7) - 0.5) * 0.8
      const b = (ruido(i, j, 8) - 0.5) * 0.8
      candidatas.push({
        x: cx + (u - v) * tw + a * tw,
        y: cy + ((u + v) * tw) / 2 + (b * tw) / 2,
        radio: tw * 0.3,
        tono: Math.min(3, Math.floor(ruido(i, j, 10) * 4)) as 0 | 1 | 2 | 3,
        orden: ruido(i, j, 9),
      })
    }
  }
  candidatas.sort((p, q) => p.orden - q.orden)
  return candidatas.slice(0, FLORES_POR_NIVEL[limitarNivel(nivel) - 1] ?? 0).map(({ orden: _orden, ...flor }) => flor)
}
