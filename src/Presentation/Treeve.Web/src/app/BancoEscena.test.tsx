import { fireEvent, render, screen } from '@testing-library/react'
import { useImperativeHandle, type Ref } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ControlEspacioVerde } from '../scene/EspacioVerde.tsx'
import { BancoEscena } from './BancoEscena.tsx'

const control = vi.hoisted(() => ({ regar: vi.fn<() => void>(), crecer: vi.fn<() => void>() }))

vi.mock('../scene/EspacioVerde.tsx', () => ({
  EspacioVerde: ({ etapa, nivelFlores, nivelBosque, pajaros, ref }: { etapa: string; nivelFlores?: number; nivelBosque?: number; pajaros?: boolean; ref?: Ref<ControlEspacioVerde> }) => {
    useImperativeHandle(ref, () => control, [])
    return <p>{`escena ${etapa} flores ${nivelFlores} bosque ${nivelBosque}${pajaros ? ' con pájaros' : ''}`}</p>
  },
}))

describe('BancoEscena', () => {
  beforeEach(() => {
    control.regar.mockClear()
    control.crecer.mockClear()
  })

  it('empieza con el lote completo', () => {
    render(<BancoEscena />)

    expect(screen.getByText('escena arbol-adulto flores 4 bosque 4 con pájaros')).toBeInTheDocument()
  })

  it('cambia la etapa del árbol y los pájaros', () => {
    render(<BancoEscena />)

    fireEvent.click(screen.getByRole('radio', { name: 'brote' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pájaros' }))

    expect(screen.getByText('escena brote flores 4 bosque 4')).toBeInTheDocument()
  })

  it('cambia el nivel de las flores y el del bosque por separado', () => {
    render(<BancoEscena />)

    fireEvent.click(screen.getAllByRole('radio', { name: '2' })[0] as HTMLElement)
    fireEvent.click(screen.getAllByRole('radio', { name: '1' })[1] as HTMLElement)

    expect(screen.getByText('escena arbol-adulto flores 2 bosque 1 con pájaros')).toBeInTheDocument()
  })

  it('riega y hace crecer la escena', () => {
    render(<BancoEscena />)

    fireEvent.click(screen.getByRole('button', { name: 'Regar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Crecer' }))

    expect(control.regar).toHaveBeenCalledOnce()
    expect(control.crecer).toHaveBeenCalledOnce()
  })
})
