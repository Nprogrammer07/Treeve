import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TarjetasResumen } from './TarjetasResumen.tsx'

describe('TarjetasResumen', () => {
  it('el porcentaje de implementadas sale de las cifras que recibe', () => {
    render(<TarjetasResumen resumen={{ total: 200, pendientes: 20, enRevision: 20, implementadas: 50, rechazadas: 110 }} />)

    expect(screen.getByText('25% del total')).toBeInTheDocument()
  })

  it('sin resumen no inventa cifras', () => {
    render(<TarjetasResumen resumen={null} />)

    expect(screen.queryByText(/\d/)).not.toBeInTheDocument()
    expect(screen.getAllByText('—')).toHaveLength(5)
  })

  it('con total cero no divide entre cero', () => {
    render(<TarjetasResumen resumen={{ total: 0, pendientes: 0, enRevision: 0, implementadas: 0, rechazadas: 0 }} />)

    expect(screen.getByText('0% del total')).toBeInTheDocument()
  })
})
