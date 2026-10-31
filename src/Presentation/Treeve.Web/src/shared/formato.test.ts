import { describe, expect, it } from 'vitest'
import { formatearFecha } from './formato.ts'

describe('formatearFecha', () => {
  it('escribe día, mes abreviado y año en español, en hora de Colombia', () => {
    expect(formatearFecha('2026-10-16T17:00:00Z')).toBe('16 oct 2026')
  })

  it('no se corre de día por la zona horaria: las 11 p. m. en Bogotá siguen siendo ese día', () => {
    expect(formatearFecha('2026-10-17T04:00:00Z')).toBe('16 oct 2026')
  })

  it('entiende las fechas con zona horaria que entrega la API', () => {
    expect(formatearFecha('2026-10-26T15:00:00-05:00')).toBe('26 oct 2026')
  })
})
