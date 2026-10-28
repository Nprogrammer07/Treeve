import { describe, expect, it } from 'vitest'
import { formatearFecha, formatearNumero, paginasVisibles, porcentaje } from './formato.ts'

describe('formatearFecha', () => {
  it('escribe día, mes abreviado y año en español, en hora de Colombia', () => {
    expect(formatearFecha('2026-10-16T17:00:00Z')).toBe('16 oct 2026')
  })

  it('no se corre de día por la zona horaria: las 11 p. m. en Bogotá siguen siendo ese día', () => {
    expect(formatearFecha('2026-10-17T04:00:00Z')).toBe('16 oct 2026')
  })
})

describe('formatearNumero', () => {
  it('usa el punto como separador de miles', () => {
    expect(formatearNumero(1240)).toBe('1.240')
    expect(formatearNumero(42)).toBe('42')
  })
})

describe('porcentaje', () => {
  it('redondea y no divide entre cero', () => {
    expect(porcentaje(1137, 1240)).toBe(92)
    expect(porcentaje(0, 0)).toBe(0)
  })
})

describe('paginasVisibles', () => {
  it('con pocas páginas las muestra todas', () => {
    expect(paginasVisibles(1, 3)).toEqual([1, 2, 3])
    expect(paginasVisibles(2, 1)).toEqual([1])
  })

  it('al inicio: 1, 2, hueco y la última', () => {
    expect(paginasVisibles(1, 124)).toEqual([1, 2, 'hueco', 124])
  })

  it('en el medio: huecos a ambos lados de las vecinas', () => {
    expect(paginasVisibles(50, 124)).toEqual([1, 'hueco', 49, 50, 51, 'hueco', 124])
  })

  it('al final: la primera, hueco y las últimas', () => {
    expect(paginasVisibles(124, 124)).toEqual([1, 'hueco', 123, 124])
  })

  it('un hueco de una sola página se reemplaza por esa página', () => {
    expect(paginasVisibles(3, 124)).toEqual([1, 2, 3, 4, 'hueco', 124])
  })
})
