import { render, screen, waitFor } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EspacioVerde, type ControlEspacioVerde } from './EspacioVerde.tsx'

const falsa = vi.hoisted(() => ({
  construida: vi.fn<(opciones: object) => void>(),
  iniciar: vi.fn<(anfitrion: HTMLElement) => Promise<void>>(),
  destruir: vi.fn<() => void>(),
  actualizar: vi.fn<(cambios: object) => void>(),
  regar: vi.fn<() => void>(),
  crecer: vi.fn<() => void>(),
}))

vi.mock('./escena.ts', () => ({
  Escena: class {
    constructor(opciones: object) {
      falsa.construida(opciones)
    }
    iniciar = falsa.iniciar
    destruir = falsa.destruir
    actualizar = falsa.actualizar
    regar = falsa.regar
    crecer = falsa.crecer
  },
}))

describe('EspacioVerde', () => {
  beforeEach(() => {
    falsa.construida.mockReset()
    falsa.iniciar.mockReset().mockResolvedValue(undefined)
    falsa.destruir.mockReset()
    falsa.actualizar.mockReset()
    falsa.regar.mockReset()
    falsa.crecer.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('descripción para lectores de pantalla', () => {
    it('cuenta la etapa del árbol, las flores y el bosque', () => {
      render(<EspacioVerde etapa="tallo" nivelFlores={2} nivelBosque={1} pajaros />)

      expect(screen.getByText(/tallo joven.*varias flores.*bosque que empieza a crecer.*pájaros volando/)).toBeInTheDocument()
    })

    it('cada nivel de flores y de bosque se cuenta distinto', () => {
      const { rerender } = render(<EspacioVerde etapa="flor" nivelFlores={1} nivelBosque={1} />)
      expect(screen.getByText(/unas pocas flores y un bosque que empieza a crecer/)).toBeInTheDocument()

      rerender(<EspacioVerde etapa="arbol-adulto" nivelFlores={4} nivelBosque={4} />)
      expect(screen.getByText(/árbol adulto.*césped lleno de flores y un bosque denso/)).toBeInTheDocument()
    })
  })

  describe('niveles del lote', () => {
    it('se los pasa a la escena al crearla', async () => {
      render(<EspacioVerde etapa="flor" nivelFlores={3} nivelBosque={2} />)
      await waitFor(() => expect(falsa.construida).toHaveBeenCalledOnce())

      expect(falsa.construida).toHaveBeenCalledWith(expect.objectContaining({ etapa: 'flor', nivelFlores: 3, nivelBosque: 2 }))
    })

    it('sin indicar niveles muestra el lote completo, como en la vista previa de la página de visitante', async () => {
      render(<EspacioVerde etapa="arbol-adulto" pajaros />)
      await waitFor(() => expect(falsa.construida).toHaveBeenCalledOnce())

      expect(falsa.construida).toHaveBeenCalledWith(expect.objectContaining({ nivelFlores: 4, nivelBosque: 4 }))
    })

    it('si el lote crece, avisa a la escena con los niveles nuevos', async () => {
      const { rerender } = render(<EspacioVerde etapa="tallo" nivelFlores={1} nivelBosque={1} />)
      await waitFor(() => expect(falsa.iniciar).toHaveBeenCalledOnce())
      falsa.actualizar.mockClear()

      rerender(<EspacioVerde etapa="tallo" nivelFlores={2} nivelBosque={1} />)

      await waitFor(() => expect(falsa.actualizar).toHaveBeenCalledWith(expect.objectContaining({ nivelFlores: 2, nivelBosque: 1 })))
    })
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

  describe('animaciones', () => {
    it('un riego pedido antes de que la escena esté lista se hace cuando lo está', async () => {
      const control = createRef<ControlEspacioVerde>()
      render(<EspacioVerde etapa="brote" ref={control} />)

      control.current?.regar()

      await waitFor(() => expect(falsa.regar).toHaveBeenCalledOnce())
    })

    it('un crecimiento pedido antes de que la escena esté lista se anima cuando lo está', async () => {
      const control = createRef<ControlEspacioVerde>()
      render(<EspacioVerde etapa="brote" ref={control} />)

      control.current?.crecer()

      await waitFor(() => expect(falsa.crecer).toHaveBeenCalledOnce())
    })

    it('expone regar() y crecer() cuando la escena ya está lista', async () => {
      const control = createRef<ControlEspacioVerde>()
      render(<EspacioVerde etapa="brote" ref={control} />)
      await waitFor(() => expect(falsa.iniciar).toHaveBeenCalledOnce())

      control.current?.regar()
      control.current?.crecer()

      expect(falsa.regar).toHaveBeenCalledOnce()
      expect(falsa.crecer).toHaveBeenCalledOnce()
    })
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
