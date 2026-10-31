import { fireEvent, render, screen } from '@testing-library/react'
import { createRef, useImperativeHandle, type Ref } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ControlEspacioVerde } from '../../scene/EspacioVerde.tsx'
import { PantallaEspacioVerde } from './PantallaEspacioVerde.tsx'

const regar = vi.hoisted(() => vi.fn<() => void>())

vi.mock('../../scene/EspacioVerde.tsx', () => ({
  EspacioVerde: ({ etapa, ref }: { etapa: string; ref?: Ref<ControlEspacioVerde> }) => {
    useImperativeHandle(ref, () => ({ regar }), [])
    return <p>{`escena ${etapa}`}</p>
  },
}))

const pantalla = (extra: Partial<Parameters<typeof PantallaEspacioVerde>[0]> = {}) => (
  <PantallaEspacioVerde apodo="Luis" etapa="tallo" controlesSonido={<p>controles de sonido</p>} onDesahogarme={() => {}} onSugerir={() => {}} onSalir={() => {}} {...extra} />
)

describe('PantallaEspacioVerde', () => {
  beforeEach(() => {
    regar.mockClear()
  })

  it('saluda por el apodo con un único título principal', () => {
    render(pantalla())

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Hola, Luis' })).toBeInTheDocument()
  })

  it('dibuja la etapa que recibe y muestra los controles de sonido', () => {
    render(pantalla())

    expect(screen.getByText('escena tallo')).toBeInTheDocument()
    expect(screen.getByText('controles de sonido')).toBeInTheDocument()
  })

  it('"Desahogarme ahora" abre el camino para desahogarse', () => {
    const onDesahogarme = vi.fn<() => void>()
    render(pantalla({ onDesahogarme }))

    fireEvent.click(screen.getByRole('button', { name: 'Desahogarme ahora' }))

    expect(onDesahogarme).toHaveBeenCalledOnce()
  })

  it('el menú inferior también lleva a desahogarse y marca la sección actual', () => {
    const onDesahogarme = vi.fn<() => void>()
    render(pantalla({ onDesahogarme }))
    const menu = screen.getByRole('navigation', { name: 'Secciones' })

    expect(menu).toHaveTextContent('Mi espacio verde')
    expect(screen.getByRole('button', { name: 'Mi espacio verde' })).toHaveAttribute('aria-current', 'page')
    fireEvent.click(screen.getByRole('button', { name: 'Desahogarme' }))

    expect(onDesahogarme).toHaveBeenCalledOnce()
  })

  it('la tarjeta de sugerencias y el menú abren las sugerencias', () => {
    const onSugerir = vi.fn<() => void>()
    render(pantalla({ onSugerir }))

    fireEvent.click(screen.getByRole('button', { name: 'Enviar una sugerencia' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sugerencias' }))

    expect(screen.getByRole('heading', { level: 2, name: 'Sugerencias' })).toBeInTheDocument()
    expect(onSugerir).toHaveBeenCalledTimes(2)
  })

  it('permite salir', () => {
    const onSalir = vi.fn<() => void>()
    render(pantalla({ onSalir }))

    fireEvent.click(screen.getByRole('button', { name: 'Salir' }))

    expect(onSalir).toHaveBeenCalledOnce()
  })

  it('cuenta con texto lo que ocurre en la escena', () => {
    render(pantalla({ aviso: 'Tu desahogo regó tu espacio verde.' }))

    expect(screen.getByRole('status')).toHaveTextContent('Tu desahogo regó tu espacio verde.')
  })

  it('deja regar la escena desde fuera', () => {
    const control = createRef<ControlEspacioVerde>()
    render(pantalla({ ref: control }))

    control.current?.regar()

    expect(regar).toHaveBeenCalledOnce()
  })

  it('no muestra datos que la API todavía no entrega (días, niveles, nutrientes, historial)', () => {
    const { container } = render(pantalla())

    expect(container.textContent).not.toMatch(/día \d|nivel \d|nutrientes|racha|historial|\d+ desahogos/i)
  })
})
