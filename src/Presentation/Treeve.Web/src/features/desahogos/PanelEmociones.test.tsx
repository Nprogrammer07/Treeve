import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PanelEmociones } from './PanelEmociones.tsx'

describe('PanelEmociones', () => {
  it('ofrece cada emoción con su nombre escrito', () => {
    render(<PanelEmociones onElegir={() => {}} />)

    for (const nombre of ['Tristeza', 'Rabia', 'Miedo', 'Duda', 'Felicidad']) {
      expect(screen.getByRole('button', { name: nombre })).toBeInTheDocument()
    }
  })

  it('las emociones forman un grupo con nombre para lectores de pantalla', () => {
    render(<PanelEmociones onElegir={() => {}} />)

    expect(screen.getByRole('group', { name: 'Elige cómo te sientes' })).toBeInTheDocument()
  })

  it('al elegir una emoción avanza de inmediato, sin botón de continuar', () => {
    const onElegir = vi.fn<(emocion: string) => void>()
    render(<PanelEmociones onElegir={onElegir} />)

    fireEvent.click(screen.getByRole('button', { name: 'Miedo' }))

    expect(onElegir).toHaveBeenCalledExactlyOnceWith('miedo')
    expect(screen.queryByRole('button', { name: 'Continuar' })).not.toBeInTheDocument()
  })

  it('cada emoción lleva su color de apoyo además del ícono y del texto', () => {
    render(<PanelEmociones onElegir={() => {}} />)

    for (const emocion of ['tristeza', 'rabia', 'miedo', 'duda', 'felicidad']) {
      expect(document.querySelector(`[data-emocion="${emocion}"]`)).not.toBeNull()
    }
  })
})
