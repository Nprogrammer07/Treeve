import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { guardarDesahogo } from './api.ts'
import { FlujoDesahogo } from './FlujoDesahogo.tsx'

vi.mock('./api.ts', () => ({ guardarDesahogo: vi.fn<typeof guardarDesahogo>() }))

const flujo = (extra: Partial<Parameters<typeof FlujoDesahogo>[0]> = {}) => (
  <FlujoDesahogo abierto onCerrar={() => {}} alGuardar={() => {}} {...extra} />
)

describe('FlujoDesahogo', () => {
  beforeEach(() => {
    vi.mocked(guardarDesahogo).mockReset()
    vi.mocked(guardarDesahogo).mockResolvedValue({ notaId: 'n-1', creadaEn: '2026-10-22T20:00:00-05:00' })
  })

  it('cerrado no muestra nada', () => {
    render(flujo({ abierto: false }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('paso 2: al abrirse pregunta cómo te sientes y ofrece las emociones', () => {
    render(flujo())

    const dialogo = within(screen.getByRole('dialog', { name: '¿Cómo te sientes hoy?' }))
    for (const nombre of ['Tristeza', 'Rabia', 'Miedo', 'Duda', 'Felicidad']) {
      expect(dialogo.getByRole('button', { name: nombre })).toBeInTheDocument()
    }
    expect(screen.queryByLabelText('Escribe lo que sientes')).not.toBeInTheDocument()
  })

  it('paso 3: al elegir la emoción muestra de inmediato dónde escribir', () => {
    render(flujo())

    fireEvent.click(screen.getByRole('button', { name: 'Miedo' }))

    expect(screen.getByLabelText('Escribe lo que sientes')).toBeInTheDocument()
    expect(screen.getByText(/Este es tu espacio seguro/)).toBeInTheDocument()
    expect(screen.getByText('Miedo')).toBeInTheDocument()
    expect(screen.getByText('0 / 2000')).toBeInTheDocument()
  })

  it('permite cambiar de emoción antes de escribir', () => {
    render(flujo())

    fireEvent.click(screen.getByRole('button', { name: 'Rabia' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar emoción' }))

    expect(screen.getByRole('button', { name: 'Rabia' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Escribe lo que sientes')).not.toBeInTheDocument()
  })

  it('al guardar envía la emoción y el texto y avisa a quien lo abrió', async () => {
    const alGuardar = vi.fn<() => void>()
    render(flujo({ alGuardar }))

    fireEvent.click(screen.getByRole('button', { name: 'Duda' }))
    fireEvent.change(screen.getByLabelText('Escribe lo que sientes'), { target: { value: 'no sé qué hacer' } })
    fireEvent.click(screen.getByRole('button', { name: 'Regar mi espacio verde' }))

    await waitFor(() => expect(alGuardar).toHaveBeenCalledOnce())
    expect(guardarDesahogo).toHaveBeenCalledWith({ emocion: 'duda', texto: 'no sé qué hacer' })
  })

  it('se puede cerrar sin guardar', () => {
    const onCerrar = vi.fn<() => void>()
    render(flujo({ onCerrar }))

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(onCerrar).toHaveBeenCalledOnce()
    expect(guardarDesahogo).not.toHaveBeenCalled()
  })

  it('al cerrar y volver a abrir empieza de cero: no queda ni la emoción ni lo escrito', () => {
    const { rerender } = render(flujo())
    fireEvent.click(screen.getByRole('button', { name: 'Tristeza' }))
    fireEvent.change(screen.getByLabelText('Escribe lo que sientes'), { target: { value: 'texto a medias' } })

    rerender(flujo({ abierto: false }))
    rerender(flujo({ abierto: true }))

    expect(screen.getByRole('button', { name: 'Tristeza' })).toBeInTheDocument()
    expect(screen.queryByDisplayValue('texto a medias')).not.toBeInTheDocument()
  })
})
