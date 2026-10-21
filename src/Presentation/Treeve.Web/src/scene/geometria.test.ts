import { describe, expect, it } from 'vitest'
import { ETAPAS, formaArbol, posicionPajaro, romboSuelo } from './geometria.ts'

describe('formaArbol', () => {
  it('crece de forma estricta de una etapa a la siguiente', () => {
    const copas = ETAPAS.map((etapa) => formaArbol(etapa).radioCopa)

    expect(copas).toEqual([...copas].sort((a, b) => a - b))
    expect(new Set(copas).size).toBe(ETAPAS.length)
  })

  it('la semilla no dibuja tronco ni copa', () => {
    expect(formaArbol('semilla')).toMatchObject({ alturaTronco: 0, radioCopa: 0 })
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
