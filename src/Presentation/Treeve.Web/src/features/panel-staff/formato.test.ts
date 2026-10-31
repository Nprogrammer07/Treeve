import { describe, expect, it } from 'vitest'
import { codigoCorto, formatearNumero, porcentaje } from './formato.ts'

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

describe('codigoCorto', () => {
  it('acorta los identificadores largos de la API a sus primeros 8 caracteres', () => {
    expect(codigoCorto('3f2504e0-4f89-11d3-9a0c-0305e82c3301')).toBe('3f2504e0')
  })

  it('deja tal cual los que ya son cortos', () => {
    expect(codigoCorto('SUG-1240')).toBe('SUG-1240')
  })
})
