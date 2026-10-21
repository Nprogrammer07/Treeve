import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { EspacioVerde, type ControlEspacioVerde } from './EspacioVerde.tsx'

const falsa = vi.hoisted(() => ({
  iniciar: vi.fn<(anfitrion: HTMLElement) => Promise<void>>(),
  destruir: vi.fn<() => void>(),
  actualizar: vi.fn<(cambios: object) => void>(),
  regar: vi.fn<() => void>(),
}))

vi.mock('./escena.ts', () => ({
  Escena: class {
    iniciar = falsa.iniciar
    destruir = falsa.destruir
    actualizar = falsa.actualizar
    regar = falsa.regar
  },
}))

describe('EspacioVerde', () => {
  it('describe la escena con texto para lectores de pantalla', () => {
    falsa.iniciar.mockResolvedValue(undefined)

    render(<EspacioVerde etapa="tallo" pajaros />)

    expect(screen.getByText(/tallo joven.*pájaros volando/)).toBeInTheDocument()
  })

  it('libera la escena al desmontarse', () => {
    falsa.iniciar.mockResolvedValue(undefined)
    falsa.destruir.mockClear()

    render(<EspacioVerde etapa="arbol" />).unmount()

    expect(falsa.destruir).toHaveBeenCalled()
  })

  it('expone regar() a quien la use', () => {
    falsa.iniciar.mockResolvedValue(undefined)
    const control = createRef<ControlEspacioVerde>()

    render(<EspacioVerde etapa="brote" ref={control} />)
    control.current?.regar()

    expect(falsa.regar).toHaveBeenCalledOnce()
  })

  it('si no hay WebGL, no rompe y conserva la descripción', async () => {
    falsa.iniciar.mockRejectedValue(new Error('sin WebGL'))

    render(<EspacioVerde etapa="semilla" />)

    expect(await screen.findByText(/semilla/)).toBeInTheDocument()
  })
})
