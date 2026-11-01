import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CampanaDeAvisos } from './CampanaDeAvisos.tsx'

describe('CampanaDeAvisos', () => {
  it('sin avisos nuevos, solo dice "Avisos" y no muestra insignia', () => {
    render(<CampanaDeAvisos sinLeer={0} onClick={() => {}} />)

    expect(screen.getByRole('button', { name: 'Avisos' })).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('con avisos sin leer, el número va escrito en el nombre accesible y en la insignia', () => {
    render(<CampanaDeAvisos sinLeer={3} onClick={() => {}} />)

    expect(screen.getByRole('button', { name: 'Avisos, 3 sin leer' })).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('con un solo aviso dice "1 sin leer"', () => {
    render(<CampanaDeAvisos sinLeer={1} onClick={() => {}} />)

    expect(screen.getByRole('button', { name: 'Avisos, 1 sin leer' })).toBeInTheDocument()
  })

  it('con muchos, la insignia dice 9+ pero el nombre accesible conserva el número exacto', () => {
    render(<CampanaDeAvisos sinLeer={23} onClick={() => {}} />)

    expect(screen.getByText('9+')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Avisos, 23 sin leer' })).toBeInTheDocument()
  })

  it('al pulsarla avisa', () => {
    const onClick = vi.fn<() => void>()
    render(<CampanaDeAvisos sinLeer={0} onClick={onClick} />)

    fireEvent.click(screen.getByRole('button', { name: 'Avisos' }))

    expect(onClick).toHaveBeenCalledOnce()
  })
})
