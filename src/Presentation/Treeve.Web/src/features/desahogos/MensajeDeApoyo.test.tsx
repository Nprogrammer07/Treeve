import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MensajeDeApoyo } from './MensajeDeApoyo.tsx'

describe('MensajeDeApoyo', () => {
  it('muestra el mensaje tal como lo entrega la API', () => {
    render(<MensajeDeApoyo mensaje={{ texto: 'Hola, Ani. Gracias por contarlo.', esDeCrisis: false }} onSeguir={() => {}} />)

    expect(screen.getByText('Hola, Ani. Gracias por contarlo.')).toBeInTheDocument()
  })

  it('lleva el foco al mensaje para que un lector de pantalla lo lea de inmediato', () => {
    render(<MensajeDeApoyo mensaje={{ texto: 'Un mensaje', esDeCrisis: false }} onSeguir={() => {}} />)

    expect(screen.getByText('Un mensaje').parentElement).toHaveFocus()
  })

  it('la persona lo cierra cuando quiera con "Seguir"; nunca se cierra solo', async () => {
    const onSeguir = vi.fn<() => void>()
    render(<MensajeDeApoyo mensaje={{ texto: 'Un mensaje', esDeCrisis: false }} onSeguir={onSeguir} />)
    await new Promise((resolver) => setTimeout(resolver, 30))
    expect(onSeguir).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))

    expect(onSeguir).toHaveBeenCalledOnce()
  })

  it('un mensaje de crisis se marca para darle un fondo más cálido, y la interfaz no agrega teléfonos ni enlaces propios', () => {
    render(<MensajeDeApoyo mensaje={{ texto: 'Estamos contigo. TODO: verificar líneas de ayuda de Colombia', esDeCrisis: true }} onSeguir={() => {}} />)

    expect(screen.getByText(/Estamos contigo/).parentElement).toHaveAttribute('data-crisis', 'true')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/\b\d{3,}\b/)
  })

  it('un mensaje común no se marca como de crisis', () => {
    render(<MensajeDeApoyo mensaje={{ texto: 'Un mensaje', esDeCrisis: false }} onSeguir={() => {}} />)

    expect(screen.getByText('Un mensaje').parentElement).toHaveAttribute('data-crisis', 'false')
  })
})
