import { fireEvent, render, screen } from '@testing-library/react'
import { useImperativeHandle, type Ref } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { ControlEspacioVerde } from '../scene/EspacioVerde.tsx'
import { BancoEscena } from './BancoEscena.tsx'

const regar = vi.hoisted(() => vi.fn<() => void>())

vi.mock('../scene/EspacioVerde.tsx', () => ({
  EspacioVerde: ({ etapa, pajaros, ref }: { etapa: string; pajaros?: boolean; ref?: Ref<ControlEspacioVerde> }) => {
    useImperativeHandle(ref, () => ({ regar }), [])
    return <p>{`escena ${etapa}${pajaros ? ' con pájaros' : ''}`}</p>
  },
}))

describe('BancoEscena', () => {
  it('cambia la etapa y los pájaros de la escena', () => {
    render(<BancoEscena />)

    fireEvent.click(screen.getByRole('radio', { name: 'brote' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pájaros' }))

    expect(screen.getByText('escena brote')).toBeInTheDocument()
  })

  it('riega la escena', () => {
    render(<BancoEscena />)

    fireEvent.click(screen.getByRole('button', { name: 'Regar' }))

    expect(regar).toHaveBeenCalledOnce()
  })
})
