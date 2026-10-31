import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ESTADOS_SUGERENCIA, ETIQUETA_ESTADO_SUGERENCIA } from '../sugerencias/estados.ts'
import { EtiquetaEstadoSugerencia } from './EtiquetaEstadoSugerencia.tsx'

describe('EtiquetaEstadoSugerencia', () => {
  it.each(ESTADOS_SUGERENCIA)('el estado "%s" siempre va escrito, no solo en color', (estado) => {
    render(<EtiquetaEstadoSugerencia estado={estado} />)

    expect(screen.getByText(ETIQUETA_ESTADO_SUGERENCIA[estado])).toBeInTheDocument()
  })

  it('usa los valores que escribe la API, con guion bajo en "en_revision"', () => {
    expect(ESTADOS_SUGERENCIA).toEqual(['pendiente', 'en_revision', 'implementada', 'rechazada'])
    expect(ETIQUETA_ESTADO_SUGERENCIA.en_revision).toBe('En revisión')
  })
})
