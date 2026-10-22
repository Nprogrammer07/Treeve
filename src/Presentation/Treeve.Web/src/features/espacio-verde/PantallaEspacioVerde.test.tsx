import { fireEvent, render, screen } from '@testing-library/react'
import { useImperativeHandle, type Ref } from 'react'
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

describe('PantallaEspacioVerde', () => {
  beforeEach(() => {
    regar.mockClear()
  })

  it('dibuja la etapa que recibe', () => {
    render(<PantallaEspacioVerde etapa="tallo" onEscribirOtro={() => {}} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Tu espacio verde' })).toBeInTheDocument()
    expect(screen.getByText('escena tallo')).toBeInTheDocument()
  })

  it('riega al entrar y lo cuenta también con texto', () => {
    render(<PantallaEspacioVerde etapa="brote" regarAlEntrar onEscribirOtro={() => {}} />)

    expect(regar).toHaveBeenCalledOnce()
    expect(screen.getByRole('status')).toHaveTextContent('Tu desahogo regó tu espacio verde.')
  })

  it('no riega si solo se está mirando el espacio verde', () => {
    render(<PantallaEspacioVerde etapa="arbol-adulto" onEscribirOtro={() => {}} />)

    expect(regar).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('permite volver a escribir', () => {
    const onEscribirOtro = vi.fn<() => void>()
    render(<PantallaEspacioVerde etapa="arbol-adulto" onEscribirOtro={onEscribirOtro} />)

    fireEvent.click(screen.getByRole('button', { name: 'Escribir otro desahogo' }))

    expect(onEscribirOtro).toHaveBeenCalledOnce()
  })
})
