import { render, screen, waitFor } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
  beforeEach(() => {
    falsa.iniciar.mockReset().mockResolvedValue(undefined)
    falsa.destruir.mockReset()
    falsa.actualizar.mockReset()
    falsa.regar.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('describe la escena con texto para lectores de pantalla', () => {
    render(<EspacioVerde etapa="tallo" pajaros />)

    expect(screen.getByText(/tallo joven.*pájaros volando/)).toBeInTheDocument()
  })

  it('libera la escena al desmontarse', async () => {
    const { unmount } = render(<EspacioVerde etapa="arbol-adulto" />)
    await waitFor(() => expect(falsa.iniciar).toHaveBeenCalledOnce())

    unmount()

    expect(falsa.destruir).toHaveBeenCalled()
  })

  it('si se desmonta antes de que PixiJS termine de descargarse, no crea la escena', async () => {
    render(<EspacioVerde etapa="arbol-adulto" />).unmount()
    await new Promise((resolver) => setTimeout(resolver, 20))

    expect(falsa.iniciar).not.toHaveBeenCalled()
  })

  it('un riego pedido antes de que la escena esté lista se hace cuando lo está', async () => {
    const control = createRef<ControlEspacioVerde>()
    render(<EspacioVerde etapa="brote" ref={control} />)

    control.current?.regar()

    await waitFor(() => expect(falsa.regar).toHaveBeenCalledOnce())
  })

  it('expone regar() cuando la escena ya está lista', async () => {
    const control = createRef<ControlEspacioVerde>()
    render(<EspacioVerde etapa="brote" ref={control} />)
    await waitFor(() => expect(falsa.iniciar).toHaveBeenCalledOnce())

    control.current?.regar()

    expect(falsa.regar).toHaveBeenCalledOnce()
  })

  it('no descarga ni inicia PixiJS hasta que la escena esté cerca de verse', async () => {
    let avisar: IntersectionObserverCallback = () => {}
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          avisar = callback
        }
        observe() {}
        disconnect() {}
      },
    )
    render(<EspacioVerde etapa="arbol-adulto" />)
    await new Promise((resolver) => setTimeout(resolver, 20))
    expect(falsa.iniciar).not.toHaveBeenCalled()

    avisar([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)

    await waitFor(() => expect(falsa.iniciar).toHaveBeenCalledOnce())
  })

  it('si no hay WebGL, no rompe y conserva la descripción', async () => {
    falsa.iniciar.mockRejectedValue(new Error('sin WebGL'))

    render(<EspacioVerde etapa="brote" />)

    expect(await screen.findByText(/brote pequeño/)).toBeInTheDocument()
  })
})
