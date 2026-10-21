import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PanelEmociones } from './PanelEmociones.tsx'

describe('PanelEmociones', () => {
  it('ofrece cada emoción con su nombre escrito', () => {
    render(<PanelEmociones onContinuar={() => {}} />)

    for (const nombre of ['Tristeza', 'Rabia', 'Miedo', 'Duda', 'Felicidad']) {
      expect(screen.getByRole('radio', { name: nombre })).toBeInTheDocument()
    }
  })

  it('no deja continuar sin elegir una emoción', () => {
    render(<PanelEmociones onContinuar={() => {}} />)

    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
  })

  it('entrega la emoción elegida al continuar', () => {
    const onContinuar = vi.fn<(emocion: string) => void>()
    render(<PanelEmociones onContinuar={onContinuar} />)

    fireEvent.click(screen.getByRole('radio', { name: 'Miedo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(onContinuar).toHaveBeenCalledExactlyOnceWith('miedo')
  })

  it('solo deja una emoción elegida a la vez', () => {
    render(<PanelEmociones onContinuar={() => {}} />)

    fireEvent.click(screen.getByRole('radio', { name: 'Rabia' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Felicidad' }))

    expect(screen.getByRole('radio', { name: 'Rabia' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Felicidad' })).toBeChecked()
  })
})
