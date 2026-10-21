import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { guardarDesahogo } from './api.ts'
import { HojaDePapel } from './HojaDePapel.tsx'

vi.mock('./api.ts', () => ({
  guardarDesahogo: vi.fn<typeof guardarDesahogo>(),
}))

const escribir = (valor: string) =>
  fireEvent.change(screen.getByLabelText('Escribe lo que sientes'), { target: { value: valor } })

describe('HojaDePapel', () => {
  beforeEach(() => {
    vi.mocked(guardarDesahogo).mockReset()
    vi.mocked(guardarDesahogo).mockResolvedValue({ notaId: 'n-1', creadaEn: '2026-10-14T22:30:00-05:00' })
  })

  it('no deja guardar una hoja vacía', () => {
    render(<HojaDePapel emocion="tristeza" onGuardado={() => {}} />)

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  })

  it('no deja guardar una hoja con solo espacios', () => {
    render(<HojaDePapel emocion="tristeza" onGuardado={() => {}} />)

    escribir('   ')

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  })

  it('muestra cuántos caracteres lleva', () => {
    render(<HojaDePapel emocion="tristeza" onGuardado={() => {}} />)

    escribir('hola')

    expect(screen.getByText('4 / 2000')).toBeInTheDocument()
  })

  it('envía la emoción y el texto a la API y avisa al terminar', async () => {
    const onGuardado = vi.fn<() => void>()
    render(<HojaDePapel emocion="rabia" onGuardado={onGuardado} />)

    escribir('texto de prueba')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(onGuardado).toHaveBeenCalledOnce())
    expect(guardarDesahogo).toHaveBeenCalledWith({ emocion: 'rabia', texto: 'texto de prueba' })
  })

  it('si falla, avisa con amabilidad y conserva lo escrito', async () => {
    vi.mocked(guardarDesahogo).mockRejectedValue(new Error('caída'))
    const onGuardado = vi.fn<() => void>()
    render(<HojaDePapel emocion="duda" onGuardado={onGuardado} />)

    escribir('esto no se debe perder')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos guardar tu desahogo')
    expect(screen.getByLabelText('Escribe lo que sientes')).toHaveValue('esto no se debe perder')
    expect(onGuardado).not.toHaveBeenCalled()
  })
})
