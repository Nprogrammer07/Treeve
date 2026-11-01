import { describe, expect, it } from 'vitest'
import { loteDePrueba } from '../../test/loteDePrueba.ts'
import { crecimientoEntre, textoDeCrecimiento, textoDeProgreso } from './lote.ts'

describe('crecimientoEntre (HU-07a: cada 3 desahogos crece un solo componente)', () => {
  const antes = loteDePrueba()

  it('detecta que creció el bosque, con su nivel nuevo', () => {
    const despues = loteDePrueba({ niveles: { arbol: 2, flores: 2, bosque: 2 } })

    expect(crecimientoEntre(antes, despues)).toEqual({ componente: 'bosque', nivel: 2 })
  })

  it('detecta que creció el árbol', () => {
    expect(crecimientoEntre(antes, loteDePrueba({ niveles: { arbol: 3, flores: 2, bosque: 1 } }))).toEqual({ componente: 'arbol', nivel: 3 })
  })

  it('detecta que crecieron las flores', () => {
    expect(crecimientoEntre(antes, loteDePrueba({ niveles: { arbol: 2, flores: 3, bosque: 1 } }))).toEqual({ componente: 'flores', nivel: 3 })
  })

  it('si solo sumó nutrición, no hubo crecimiento: no hay animación especial', () => {
    expect(crecimientoEntre(antes, loteDePrueba({ riegos: 8, nutricion: 2, riegosParaElSiguiente: 1 }))).toBeNull()
  })

  it('un lote igual no es crecimiento', () => {
    expect(crecimientoEntre(antes, loteDePrueba())).toBeNull()
  })

  it('si un nivel bajara (no debería), tampoco cuenta como crecimiento', () => {
    expect(crecimientoEntre(antes, loteDePrueba({ niveles: { arbol: 1, flores: 2, bosque: 1 } }))).toBeNull()
  })
})

describe('textoDeCrecimiento', () => {
  it('el árbol se cuenta por su etapa', () => {
    expect(textoDeCrecimiento('arbol', 3)).toBe('¡Tu espacio verde creció! El árbol llegó a la etapa Flor.')
    expect(textoDeCrecimiento('arbol', 4)).toBe('¡Tu espacio verde creció! El árbol llegó a la etapa Árbol adulto.')
  })

  it('las flores y el bosque, por su nivel y con la concordancia correcta', () => {
    expect(textoDeCrecimiento('flores', 2)).toBe('¡Tu espacio verde creció! Las flores subieron al nivel 2.')
    expect(textoDeCrecimiento('bosque', 3)).toBe('¡Tu espacio verde creció! El bosque subió al nivel 3.')
  })
})

describe('textoDeProgreso', () => {
  it('cuenta cuántos desahogos faltan y qué crecerá', () => {
    expect(textoDeProgreso(loteDePrueba())).toBe('Te faltan 2 desahogos para que crezca el bosque.')
    expect(textoDeProgreso(loteDePrueba({ riegosParaElSiguiente: 3, siguienteEnCrecer: 'arbol' }))).toBe('Te faltan 3 desahogos para que crezca el árbol.')
  })

  it('con las flores el verbo va en plural', () => {
    expect(textoDeProgreso(loteDePrueba({ siguienteEnCrecer: 'flores' }))).toBe('Te faltan 2 desahogos para que crezcan las flores.')
  })

  it('con uno solo, va en singular', () => {
    expect(textoDeProgreso(loteDePrueba({ riegosParaElSiguiente: 1 }))).toBe('Te falta 1 desahogo para que crezca el bosque.')
  })

  it('un lote completo lo celebra', () => {
    expect(textoDeProgreso(loteDePrueba({ completo: true, siguienteEnCrecer: null, riegosParaElSiguiente: 0 }))).toBe('¡Tu espacio verde está completo!')
  })

  it('si no hay nada que decir, no inventa nada', () => {
    expect(textoDeProgreso(loteDePrueba({ siguienteEnCrecer: null, riegosParaElSiguiente: 0 }))).toBe('')
    expect(textoDeProgreso(loteDePrueba({ riegosParaElSiguiente: 0 }))).toBe('')
  })
})
