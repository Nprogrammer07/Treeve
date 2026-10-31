import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { enviarSugerencia, listarMisSugerencias } from './api.ts'
import { VentanaSugerencias } from './VentanaSugerencias.tsx'

vi.mock('./api.ts', () => ({
  enviarSugerencia: vi.fn<typeof enviarSugerencia>(),
  listarMisSugerencias: vi.fn<typeof listarMisSugerencias>(),
}))

const ventana = (extra: Partial<Parameters<typeof VentanaSugerencias>[0]> = {}) => <VentanaSugerencias abierto onCerrar={() => {}} {...extra} />

describe('VentanaSugerencias', () => {
  beforeEach(() => {
    vi.mocked(enviarSugerencia).mockReset().mockResolvedValue({ sugerenciaId: 's-1', creadaEn: '2026-10-26T15:00:00-05:00', estado: 'pendiente' })
    vi.mocked(listarMisSugerencias).mockReset().mockResolvedValue([])
  })

  it('cerrada no muestra nada', () => {
    render(ventana({ abierto: false }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('al abrirse muestra el formulario para enviar', () => {
    render(ventana())

    expect(screen.getByRole('dialog', { name: 'Enviar una sugerencia' })).toBeInTheDocument()
    expect(screen.getByLabelText('Escribe tu sugerencia')).toBeInTheDocument()
  })

  it('al enviar muestra la confirmación y permite enviar otra', async () => {
    render(ventana())

    fireEvent.change(screen.getByLabelText('Escribe tu sugerencia'), { target: { value: 'Un modo oscuro' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar sugerencia' }))

    expect(await screen.findByRole('dialog', { name: 'Sugerencia enviada' })).toHaveTextContent('Recibimos tu sugerencia')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar otra' }))
    expect(screen.getByLabelText('Escribe tu sugerencia')).toHaveValue('')
  })

  it('desde la confirmación se puede ir al historial, y volver a enviar', async () => {
    vi.mocked(listarMisSugerencias).mockResolvedValue([{ sugerenciaId: 's-1', texto: 'Un modo oscuro', estado: 'pendiente', creadaEn: '2026-10-26T15:00:00-05:00', comentario: null, respondidaEn: null }])
    render(ventana())
    fireEvent.change(screen.getByLabelText('Escribe tu sugerencia'), { target: { value: 'Un modo oscuro' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar sugerencia' }))
    await screen.findByRole('dialog', { name: 'Sugerencia enviada' })

    fireEvent.click(screen.getByRole('button', { name: 'Ver mis sugerencias' }))

    expect(await screen.findByText('Un modo oscuro')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Mis sugerencias' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar una sugerencia' }))
    expect(screen.getByRole('dialog', { name: 'Enviar una sugerencia' })).toBeInTheDocument()
  })

  it('se puede cerrar con la X', () => {
    const onCerrar = vi.fn<() => void>()
    render(ventana({ onCerrar }))

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(onCerrar).toHaveBeenCalledOnce()
  })

  it('al cerrar y volver a abrir empieza de cero, en el formulario y sin el texto anterior', async () => {
    const { rerender } = render(ventana())
    fireEvent.change(screen.getByLabelText('Escribe tu sugerencia'), { target: { value: 'texto a medias' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ver mis sugerencias' }))

    rerender(ventana({ abierto: false }))
    rerender(ventana({ abierto: true }))

    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Enviar una sugerencia' })).toBeInTheDocument())
    expect(screen.getByLabelText('Escribe tu sugerencia')).toHaveValue('')
  })
})
