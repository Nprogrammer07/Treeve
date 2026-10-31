import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listarMisSugerencias } from './api.ts'
import { HistorialSugerencias } from './HistorialSugerencias.tsx'
import type { SugerenciaPropia } from './tipos.ts'

vi.mock('./api.ts', () => ({ listarMisSugerencias: vi.fn<typeof listarMisSugerencias>() }))

describe('HistorialSugerencias', () => {
  beforeEach(() => {
    vi.mocked(listarMisSugerencias).mockReset()
  })

  it('mientras carga lo dice', () => {
    vi.mocked(listarMisSugerencias).mockReturnValue(new Promise(() => {}))
    render(<HistorialSugerencias />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando tus sugerencias')
  })

  it('lista cada sugerencia con su texto, su fecha y su estado escrito', async () => {
    vi.mocked(listarMisSugerencias).mockResolvedValue([
      { sugerenciaId: 's-2', texto: 'Más sonidos de lluvia', estado: 'en_revision', creadaEn: '2026-10-26T15:00:00-05:00', comentario: null, respondidaEn: null },
      { sugerenciaId: 's-1', texto: 'Un modo oscuro', estado: 'pendiente', creadaEn: '2026-10-20T10:00:00-05:00', comentario: null, respondidaEn: null },
    ])
    render(<HistorialSugerencias />)

    const elementos = await screen.findAllByRole('listitem')
    expect(elementos).toHaveLength(2)
    expect(within(elementos[0] as HTMLElement).getByText('Más sonidos de lluvia')).toBeInTheDocument()
    expect(within(elementos[0] as HTMLElement).getByText('26 oct 2026')).toBeInTheDocument()
    expect(within(elementos[0] as HTMLElement).getByText('En revisión')).toBeInTheDocument()
    expect(within(elementos[1] as HTMLElement).getByText('Pendiente')).toBeInTheDocument()
  })

  it('sin sugerencias lo dice con amabilidad', async () => {
    vi.mocked(listarMisSugerencias).mockResolvedValue([])
    render(<HistorialSugerencias />)

    expect(await screen.findByText('Todavía no has enviado sugerencias.')).toBeInTheDocument()
  })

  it('si no se pueden cargar, avisa y permite reintentar', async () => {
    vi.mocked(listarMisSugerencias).mockRejectedValueOnce(new Error('caída'))
    vi.mocked(listarMisSugerencias).mockResolvedValue([{ sugerenciaId: 's-1', texto: 'Un modo oscuro', estado: 'implementada', creadaEn: '2026-10-20T10:00:00-05:00', comentario: null, respondidaEn: null }])
    render(<HistorialSugerencias />)

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar tus sugerencias')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Un modo oscuro')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  describe('HU-11: la respuesta del equipo', () => {
    const conRespuesta = (extra: Partial<SugerenciaPropia> = {}): SugerenciaPropia => ({
      sugerenciaId: 's-1',
      texto: 'Un modo oscuro',
      estado: 'implementada',
      creadaEn: '2026-10-20T10:00:00-05:00',
      comentario: 'Ya está disponible en los ajustes.',
      respondidaEn: '2026-10-30T10:00:00-05:00',
      ...extra,
    })

    it('muestra el comentario del equipo, aparte de lo que escribió la persona, con su fecha', async () => {
      vi.mocked(listarMisSugerencias).mockResolvedValue([conRespuesta()])
      render(<HistorialSugerencias />)

      const elemento = within(await screen.findByRole('listitem'))
      expect(elemento.getByText('Respuesta del equipo')).toBeInTheDocument()
      expect(elemento.getByText('Ya está disponible en los ajustes.')).toBeInTheDocument()
      expect(elemento.getByText('30 oct 2026')).toBeInTheDocument()
      expect(elemento.getByText('Un modo oscuro')).toBeInTheDocument()
    })

    it('no dice quién del equipo respondió: la API no lo informa y la interfaz no lo inventa', async () => {
      vi.mocked(listarMisSugerencias).mockResolvedValue([conRespuesta()])
      render(<HistorialSugerencias />)

      await screen.findByText('Respuesta del equipo')

      expect(document.body.textContent).not.toMatch(/respondió|escrito por|staff|administrador/i)
    })

    it('sin comentario no muestra el bloque de respuesta', async () => {
      vi.mocked(listarMisSugerencias).mockResolvedValue([conRespuesta({ comentario: null, respondidaEn: null })])
      render(<HistorialSugerencias />)

      await screen.findByText('Un modo oscuro')

      expect(screen.queryByText('Respuesta del equipo')).not.toBeInTheDocument()
    })

    it('si el equipo solo cambió el estado, lo cuenta con su fecha y sin inventar una respuesta', async () => {
      vi.mocked(listarMisSugerencias).mockResolvedValue([conRespuesta({ comentario: null })])
      render(<HistorialSugerencias />)

      expect(await screen.findByText('El equipo actualizó el estado el 30 oct 2026.')).toBeInTheDocument()
      expect(screen.queryByText('Respuesta del equipo')).not.toBeInTheDocument()
    })

    it('un comentario con saltos de línea se muestra como texto, nunca como HTML', async () => {
      vi.mocked(listarMisSugerencias).mockResolvedValue([conRespuesta({ comentario: '<b>negrita</b>\nSegunda línea' })])
      render(<HistorialSugerencias />)

      await screen.findByText(/Segunda línea/)

      expect(document.querySelector('b')).toBeNull()
      expect(screen.getByText(/<b>negrita<\/b>/)).toBeInTheDocument()
    })
  })
})
