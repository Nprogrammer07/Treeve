import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enviarSugerencia, listarMisSugerencias } from '../features/sugerencias/api.ts'
import { borrarSesion, guardarSesion } from '../shared/api/sesion.ts'
import { loteDePrueba } from '../test/loteDePrueba.ts'
import App from './App.tsx'

vi.mock('../scene/EspacioVerde.tsx', () => ({ EspacioVerde: () => <p>escena</p> }))
vi.mock('../features/espacio-verde/api.ts', () => ({ consultarEspacioVerde: () => Promise.resolve(loteDePrueba()) }))
vi.mock('../features/sugerencias/api.ts', () => ({
  enviarSugerencia: vi.fn<typeof enviarSugerencia>(),
  listarMisSugerencias: vi.fn<typeof listarMisSugerencias>(),
}))

describe('HU-09: sugerencias desde el espacio verde', () => {
  beforeEach(() => {
    guardarSesion({ usuarioId: 'u-1', apodo: 'Luis', token: 'token-secreto', expiraEn: '2999-01-01T00:00:00Z' })
    vi.mocked(enviarSugerencia).mockReset().mockResolvedValue({ sugerenciaId: 's-1', creadaEn: '2026-10-26T15:00:00-05:00', estado: 'pendiente' })
    vi.mocked(listarMisSugerencias).mockReset().mockResolvedValue([{ sugerenciaId: 's-1', texto: 'Un modo oscuro', estado: 'pendiente', creadaEn: '2026-10-26T15:00:00-05:00', comentario: null, respondidaEn: null }])
  })

  afterEach(() => {
    borrarSesion()
  })

  it('la tarjeta "Enviar una sugerencia" abre el formulario', () => {
    render(<App />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Enviar una sugerencia' }))

    expect(screen.getByRole('dialog', { name: 'Enviar una sugerencia' })).toBeInTheDocument()
  })

  it('el menú inferior también abre las sugerencias', () => {
    render(<App />)

    fireEvent.click(within(screen.getByRole('navigation', { name: 'Secciones' })).getByRole('button', { name: 'Sugerencias' }))

    expect(screen.getByRole('dialog', { name: 'Enviar una sugerencia' })).toBeInTheDocument()
  })

  it('se envía una sugerencia y luego se ve en el historial, con su estado', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Enviar una sugerencia' }))

    fireEvent.change(screen.getByLabelText('Escribe tu sugerencia'), { target: { value: 'Un modo oscuro' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar sugerencia' }))
    await screen.findByRole('dialog', { name: 'Sugerencia enviada' })
    fireEvent.click(screen.getByRole('button', { name: 'Ver mis sugerencias' }))

    expect(await screen.findByText('Un modo oscuro')).toBeInTheDocument()
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
    expect(enviarSugerencia).toHaveBeenCalledWith({ texto: 'Un modo oscuro' })
  })

  it('"Salir" cierra las sugerencias y vuelve a la página de visitante', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Enviar una sugerencia' }))

    fireEvent.click(screen.getByRole('button', { name: 'Salir' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Cultiva tu paz interior' })).toBeInTheDocument()
  })
})
