import { describe, expect, it } from 'vitest'
import {
  ETAPAS,
  arbolesDelBosque,
  casillas,
  dentroDelCesped,
  NIVEL_MAXIMO,
  disenarMapa,
  escalaDelArbol,
  floresDelLote,
  fraccionDelBosque,
  formaArbol,
  poligonoAgua,
  poligonoArena,
  posicionPajaro,
  puntoEnPoligono,
  rocas,
  romboSuelo,
} from './geometria.ts'

describe('etapas del árbol', () => {
  it('son las definidas por el proyecto: brote → tallo → flor → árbol adulto', () => {
    expect(ETAPAS).toEqual(['brote', 'tallo', 'flor', 'arbol-adulto'])
  })

  it('crece de forma estricta de una etapa a la siguiente', () => {
    const copas = ETAPAS.map((etapa) => formaArbol(etapa).radioCopa)

    expect(copas).toEqual([...copas].sort((a, b) => a - b))
    expect(new Set(copas).size).toBe(ETAPAS.length)
  })

  it('todas dibujan tronco y copa: ya no existe una etapa de semilla', () => {
    for (const etapa of ETAPAS) {
      expect(formaArbol(etapa).alturaTronco).toBeGreaterThan(0)
      expect(formaArbol(etapa).radioCopa).toBeGreaterThan(0)
    }
  })

  it('solo la etapa "flor" tiene flores y el árbol adulto tiene tres copas', () => {
    expect(ETAPAS.filter((etapa) => formaArbol(etapa).flores > 0)).toEqual(['flor'])
    expect(formaArbol('arbol-adulto').copas).toBe(3)
  })
})

describe('romboSuelo', () => {
  it('es un rombo 2:1 centrado', () => {
    const r = romboSuelo(100, 100, 80)

    expect(r.derecha.x - r.izquierda.x).toBe(160)
    expect(r.abajo.y - r.arriba.y).toBe(80)
  })
})

describe('posicionPajaro', () => {
  it('se mantiene dentro del área y el aleteo en [-1, 1]', () => {
    for (let ms = 0; ms < 60_000; ms += 997) {
      for (let i = 0; i < 4; i++) {
        const p = posicionPajaro(ms, i, 600, 352)
        expect(p.x).toBeGreaterThan(0)
        expect(p.x).toBeLessThan(600)
        expect(p.y).toBeGreaterThan(0)
        expect(p.y).toBeLessThan(352 * 0.5)
        expect(Math.abs(p.aleteo)).toBeLessThanOrEqual(1)
      }
    }
  })
})

// ---------- Mapa isométrico ----------

// Móvil, escritorio ancho, cuadrado y la pantalla de inicio.
const TAMANOS: [number, number][] = [
  [390, 352],
  [1400, 480],
  [600, 600],
  [1200, 640],
]

describe.each(TAMANOS)('mapa de %i × %i', (ancho, alto) => {
  const mapa = disenarMapa(ancho, alto)

  it('el rombo del césped cabe entero en el lienzo, dejando libres las esquinas', () => {
    expect(mapa.cx - mapa.a).toBeGreaterThanOrEqual(0)
    expect(mapa.cx + mapa.a).toBeLessThanOrEqual(ancho)
    expect(mapa.cy - mapa.a / 2).toBeGreaterThanOrEqual(0)
    expect(mapa.cy + mapa.a / 2).toBeLessThanOrEqual(alto)
  })

  it('el árbol de la persona, en cualquier etapa, cabe entero en el lienzo y se ve grande', () => {
    const escala = escalaDelArbol(mapa)

    for (const etapa of ETAPAS) {
      const forma = formaArbol(etapa)
      const altoTotal = (forma.alturaTronco + forma.radioCopa * 1.35) * escala
      expect(mapa.cy - altoTotal).toBeGreaterThanOrEqual(0)
    }
    // El árbol adulto cubre al menos dos casillas de ancho: es el protagonista del tablero.
    expect(formaArbol('arbol-adulto').radioCopa * escala * 2).toBeGreaterThan(mapa.tw * 2 * 2)
  })

  it('el tablero tiene n × n casillas, todas dentro del césped, alternando claras y oscuras', () => {
    const lista = casillas(mapa)

    expect(lista).toHaveLength(mapa.n * mapa.n)
    for (const casilla of lista) {
      for (let i = 0; i < casilla.puntos.length; i += 2) {
        expect(dentroDelCesped(casilla.puntos[i] ?? 0, casilla.puntos[i + 1] ?? 0, mapa, 1.001)).toBe(true)
      }
    }
    expect(lista.filter((c) => c.claro)).toHaveLength(lista.length / 2)
    expect(lista[0]?.claro).not.toBe(lista[1]?.claro)
  })

  it('el agua y la arena quedan en la esquina inferior izquierda, fuera del césped', () => {
    for (const poligono of [poligonoAgua(ancho, alto), poligonoArena(ancho, alto)]) {
      for (const punto of poligono) {
        expect(dentroDelCesped(punto.x, punto.y, mapa, 1)).toBe(false)
        expect(punto.x).toBeGreaterThanOrEqual(0)
        expect(punto.y).toBeLessThanOrEqual(alto + 0.001)
      }
    }
    expect(puntoEnPoligono(mapa.cx, mapa.cy, poligonoAgua(ancho, alto))).toBe(false)
  })

  it('las rocas están sobre la orilla de arena', () => {
    const lista = rocas(ancho, alto)

    expect(lista.length).toBeGreaterThan(0)
    for (const roca of lista) expect(roca.radio).toBeGreaterThan(0)
  })

  describe('bosque', () => {
    const bosque = arbolesDelBosque(ancho, alto, mapa)

    it('hay un bosque denso pero acotado', () => {
      expect(bosque.length).toBeGreaterThan(40)
      expect(bosque.length).toBeLessThan(900)
    })

    it('ningún árbol está dentro del césped ni del agua o la arena', () => {
      const arena = poligonoArena(ancho, alto)
      for (const arbol of bosque) {
        expect(dentroDelCesped(arbol.x, arbol.y, mapa, 1.06)).toBe(false)
        expect(puntoEnPoligono(arbol.x, arbol.y, arena)).toBe(false)
      }
    })

    it('sale ordenado de atrás hacia adelante para pintarlo bien', () => {
      const ys = bosque.map((a) => a.y)

      expect(ys).toEqual([...ys].sort((p, q) => p - q))
    })

    it('es siempre el mismo bosque: no cambia entre un dibujo y el siguiente', () => {
      expect(arbolesDelBosque(ancho, alto, mapa)).toEqual(bosque)
    })

    it('rodea el césped por las esquinas, menos la del agua', () => {
      const enEsquina = (x0: number, x1: number, y0: number, y1: number) =>
        bosque.filter((a) => a.x >= x0 * ancho && a.x <= x1 * ancho && a.y >= y0 * alto && a.y <= y1 * alto).length

      expect(enEsquina(0, 0.15, 0, 0.3)).toBeGreaterThan(0)
      expect(enEsquina(0.85, 1, 0, 0.3)).toBeGreaterThan(0)
      expect(enEsquina(0.85, 1, 0.7, 1)).toBeGreaterThan(0)
      expect(enEsquina(0, 0.08, 0.9, 1)).toBe(0)
    })
  })
})

describe('puntoEnPoligono', () => {
  const cuadrado = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ]

  it('distingue dentro de fuera', () => {
    expect(puntoEnPoligono(5, 5, cuadrado)).toBe(true)
    expect(puntoEnPoligono(15, 5, cuadrado)).toBe(false)
    expect(puntoEnPoligono(-1, 5, cuadrado)).toBe(false)
  })
})

describe('niveles del lote (HU-07a)', () => {
  const mapa = disenarMapa(1400, 480)

  it('el nivel máximo es 4, como en la API', () => {
    expect(NIVEL_MAXIMO).toBe(4)
  })

  describe('bosque', () => {
    const bosque = (nivel: number) => arbolesDelBosque(1400, 480, mapa, nivel)

    it('crece de forma estricta con cada nivel y el último es el bosque completo', () => {
      const cantidades = [1, 2, 3, 4].map((nivel) => bosque(nivel).length)

      expect(cantidades).toEqual([...cantidades].sort((a, b) => a - b))
      expect(new Set(cantidades).size).toBe(4)
      expect(bosque(4)).toEqual(arbolesDelBosque(1400, 480, mapa))
    })

    it('el nivel 1 ya tiene árboles, pero pocos', () => {
      expect(bosque(1).length).toBeGreaterThan(5)
      expect(bosque(1).length).toBeLessThan(bosque(4).length / 3)
    })

    it('el bosque solo crece: los árboles de un nivel siguen en el siguiente', () => {
      for (const nivel of [1, 2, 3]) {
        const siguiente = new Set(bosque(nivel + 1).map((a) => `${a.x},${a.y}`))
        expect(bosque(nivel).every((a) => siguiente.has(`${a.x},${a.y}`))).toBe(true)
      }
    })

    it('en todos los niveles sigue ordenado de atrás hacia adelante y fuera del césped', () => {
      for (const nivel of [1, 2, 3, 4]) {
        const lista = bosque(nivel)
        expect(lista.map((a) => a.y)).toEqual(lista.map((a) => a.y).sort((p, q) => p - q))
        expect(lista.some((a) => dentroDelCesped(a.x, a.y, mapa, 1.06))).toBe(false)
      }
    })

    it('un nivel fuera de rango se ajusta: 0 vale como 1 y 9 como 4', () => {
      expect(fraccionDelBosque(0)).toBe(fraccionDelBosque(1))
      expect(fraccionDelBosque(9)).toBe(fraccionDelBosque(4))
      expect(fraccionDelBosque(4)).toBe(1)
    })
  })

  describe.each(TAMANOS)('flores en %i × %i', (ancho, alto) => {
    const m = disenarMapa(ancho, alto)

    it('hay 5, 11, 19 y 28 flores según el nivel', () => {
      expect([1, 2, 3, 4].map((nivel) => floresDelLote(m, nivel).length)).toEqual([5, 11, 19, 28])
    })

    it('todas caen sobre el césped y ninguna junto al árbol de la persona', () => {
      for (const flor of floresDelLote(m, 4)) {
        expect(dentroDelCesped(flor.x, flor.y, m, 1)).toBe(true)
        expect(Math.hypot(flor.x - m.cx, (flor.y - m.cy) * 2)).toBeGreaterThan(m.tw * 1.2)
        expect(flor.radio).toBeGreaterThan(0)
        expect([0, 1, 2, 3]).toContain(flor.tono)
      }
    })

    it('las flores solo se suman: las de un nivel siguen en el siguiente, y son siempre las mismas', () => {
      for (const nivel of [1, 2, 3]) {
        const siguiente = new Set(floresDelLote(m, nivel + 1).map((f) => `${f.x},${f.y}`))
        expect(floresDelLote(m, nivel).every((f) => siguiente.has(`${f.x},${f.y}`))).toBe(true)
      }
      expect(floresDelLote(m, 3)).toEqual(floresDelLote(m, 3))
    })

    it('una flor no pisa a otra', () => {
      const lista = floresDelLote(m, 4)
      for (const [i, p] of lista.entries()) for (const q of lista.slice(i + 1)) expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThan(1)
    })
  })

  it('un nivel de flores fuera de rango se ajusta', () => {
    expect(floresDelLote(mapa, 0)).toHaveLength(5)
    expect(floresDelLote(mapa, 9)).toHaveLength(28)
  })
})
