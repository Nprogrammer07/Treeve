import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { guardarDesahogo } from './api.ts'
import { FlujoDesahogo } from './FlujoDesahogo.tsx'

vi.mock('./api.ts', () => ({
  guardarDesahogo: vi.fn<typeof guardarDesahogo>().mockResolvedValue({ notaId: 'n-1', creadaEn: '2026-10-14T22:30:00-05:00' }),
}))

describe('FlujoDesahogo', () => {
  it('lleva de la emoción a la hoja y de ahí a la confirmación', async () => {
    render(<FlujoDesahogo />)

    fireEvent.click(screen.getByRole('radio', { name: 'Duda' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.change(screen.getByLabelText('Escribe lo que sientes'), { target: { value: 'no sé qué hacer' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Tu desahogo quedó guardado.')
    expect(guardarDesahogo).toHaveBeenCalledWith({ emocion: 'duda', texto: 'no sé qué hacer' })
  })

  it('permite cambiar de emoción antes de escribir', () => {
    render(<FlujoDesahogo />)

    fireEvent.click(screen.getByRole('radio', { name: 'Rabia' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar emoción' }))

    expect(screen.getByRole('radio', { name: 'Rabia' })).toBeInTheDocument()
  })

  it('después de guardar permite escribir otro desahogo', async () => {
    render(<FlujoDesahogo />)

    fireEvent.click(screen.getByRole('radio', { name: 'Felicidad' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.change(screen.getByLabelText('Escribe lo que sientes'), { target: { value: 'buen día' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Escribir otro' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled())
  })

  it('si app/ pide avisar al guardar, no muestra su propia confirmación', async () => {
    const alGuardar = vi.fn<() => void>()
    render(<FlujoDesahogo alGuardar={alGuardar} />)

    fireEvent.click(screen.getByRole('radio', { name: 'Miedo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.change(screen.getByLabelText('Escribe lo que sientes'), { target: { value: 'tengo miedo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(alGuardar).toHaveBeenCalledOnce())
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
