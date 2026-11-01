import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { consultarEspacioVerde } from '../features/espacio-verde/api.ts'
import { listarNotificaciones, marcarComoLeida } from '../features/notificaciones/api.ts'
import type { Notificacion } from '../features/notificaciones/tipos.ts'
import { enviarSugerencia, listarMisSugerencias } from '../features/sugerencias/api.ts'
import { borrarSesion, guardarSesion } from '../shared/api/sesion.ts'
import { loteDePrueba } from '../test/loteDePrueba.ts'
import App from './App.tsx'

vi.mock('../scene/EspacioVerde.tsx', () => ({ EspacioVerde: () => <p>escena</p> }))
vi.mock('../features/espacio-verde/api.ts', () => ({ consultarEspacioVerde: vi.fn<typeof consultarEspacioVerde>() }))
vi.mock('../features/notificaciones/api.ts', () => ({ listarNotificaciones: vi.fn<typeof listarNotificaciones>(), marcarComoLeida: vi.fn<typeof marcarComoLeida>() }))
vi.mock('../features/sugerencias/api.ts', () => ({ enviarSugerencia: vi.fn<typeof enviarSugerencia>(), listarMisSugerencias: vi.fn<typeof listarMisSugerencias>() }))

const aviso = (id: string, extra: Partial<Notificacion> = {}): Notificacion => ({ id, tipo: 'otro', mensaje: `Mensaje ${id}`, creadaEn: '2026-10-31T10:00:00-05:00', leida: false, ...extra })
const campana = () => screen.findByRole('button', { name: /^Avisos/ })

describe('Avisos: la campana, la ventana y sus acciones', () => {
  beforeEach(() => {
    guardarSesion({ usuarioId: 'u-1', apodo: 'Luis', token: 'token-secreto', expiraEn: '2999-01-01T00:00:00Z' })
    vi.mocked(consultarEspacioVerde).mockReset().mockResolvedValue(loteDePrueba())
    vi.mocked(listarNotificaciones).mockReset().mockResolvedValue([aviso('n-1'), aviso('n-2'), aviso('n-3', { leida: true })])
    vi.mocked(marcarComoLeida).mockReset().mockResolvedValue(undefined)
    vi.mocked(listarMisSugerencias).mockReset().mockResolvedValue([])
  })

  afterEach(() => {
    borrarSesion()
  })

  it('la campana dice cuántos avisos hay sin leer', async () => {
    render(<App />)

    expect(await screen.findByRole('button', { name: 'Avisos, 2 sin leer' })).toBeInTheDocument()
  })

  it('sin avisos sin leer, la campana no muestra número', async () => {
    vi.mocked(listarNotificaciones).mockResolvedValue([aviso('n-1', { leida: true })])
    render(<App />)

    expect(await screen.findByRole('button', { name: 'Avisos' })).toBeInTheDocument()
  })

  it('si no se pueden cargar los avisos, la pantalla sigue funcionando sin campana rota', async () => {
    vi.mocked(listarNotificaciones).mockRejectedValue(new Error('caída'))
    render(<App />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Hola, Luis' })).toBeInTheDocument()
    expect(await campana()).toHaveAccessibleName('Avisos')
  })

  it('la página de visitante no pide avisos: sin sesión no hay avisos que pedir', () => {
    borrarSesion()
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Cultiva tu paz interior' })).toBeInTheDocument()
    expect(listarNotificaciones).not.toHaveBeenCalled()
  })

  describe('la ventana', () => {
    it('al pulsar la campana abre la ventana con los avisos y vuelve a pedir la lista', async () => {
      render(<App />)
      fireEvent.click(await screen.findByRole('button', { name: 'Avisos, 2 sin leer' }))

      expect(screen.getByRole('dialog', { name: 'Tus avisos' })).toBeInTheDocument()
      expect(screen.getByText('Mensaje n-1')).toBeInTheDocument()
      await waitFor(() => expect(listarNotificaciones).toHaveBeenCalledTimes(2))
    })

    it('si llegó un aviso nuevo desde la última vez, aparece al abrir', async () => {
      vi.mocked(listarNotificaciones).mockResolvedValueOnce([aviso('n-1', { leida: true })]).mockResolvedValue([aviso('n-9', { mensaje: 'Aviso recién llegado' }), aviso('n-1', { leida: true })])
      render(<App />)
      fireEvent.click(await screen.findByRole('button', { name: 'Avisos' }))

      expect(await screen.findByText('Aviso recién llegado')).toBeInTheDocument()
    })

    it('marcar uno como leído baja el número de la campana y avisa a la API', async () => {
      render(<App />)
      fireEvent.click(await screen.findByRole('button', { name: 'Avisos, 2 sin leer' }))

      fireEvent.click(screen.getAllByRole('button', { name: 'Marcar como leído' })[0] as HTMLElement)

      expect(marcarComoLeida).toHaveBeenCalledWith('n-1')
      expect(await screen.findByRole('button', { name: 'Avisos, 1 sin leer' })).toBeInTheDocument()
    })

    it('"Marcar todos como leídos" deja la campana sin número', async () => {
      render(<App />)
      fireEvent.click(await screen.findByRole('button', { name: 'Avisos, 2 sin leer' }))

      fireEvent.click(screen.getByRole('button', { name: 'Marcar todos como leídos' }))

      expect(await screen.findByRole('button', { name: 'Avisos' })).toBeInTheDocument()
      expect(screen.getByText('Todo al día.')).toBeInTheDocument()
      expect(marcarComoLeida).toHaveBeenCalledTimes(2)
    })

    it('si la API no deja marcarlo, el aviso sigue sin leer y se explica', async () => {
      vi.mocked(marcarComoLeida).mockRejectedValue(new Error('caída'))
      render(<App />)
      fireEvent.click(await screen.findByRole('button', { name: 'Avisos, 2 sin leer' }))

      fireEvent.click(screen.getAllByRole('button', { name: 'Marcar como leído' })[0] as HTMLElement)

      expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos marcarlo como leído')
      expect(screen.getByRole('button', { name: 'Avisos, 2 sin leer' })).toBeInTheDocument()
    })

    it('se puede cerrar y los avisos se conservan', async () => {
      render(<App />)
      fireEvent.click(await screen.findByRole('button', { name: 'Avisos, 2 sin leer' }))

      fireEvent.click(within(screen.getByRole('dialog', { name: 'Tus avisos' })).getByRole('button', { name: 'Cerrar' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Avisos, 2 sin leer' })).toBeInTheDocument()
    })
  })

  describe('acciones de los avisos', () => {
    it('una sugerencia respondida lleva directo al historial y muestra la respuesta del equipo', async () => {
      vi.mocked(listarNotificaciones).mockResolvedValue([aviso('n-1', { tipo: 'sugerencia_respondida', mensaje: 'El equipo respondió una de tus sugerencias.' })])
      vi.mocked(listarMisSugerencias).mockResolvedValue([{ sugerenciaId: 's-1', texto: 'Un modo oscuro', estado: 'implementada', creadaEn: '2026-10-20T10:00:00-05:00', comentario: 'Ya está en los ajustes.', respondidaEn: '2026-10-30T10:00:00-05:00' }])
      render(<App />)
      fireEvent.click(await screen.findByRole('button', { name: 'Avisos, 1 sin leer' }))

      fireEvent.click(screen.getByRole('button', { name: 'Ver mis sugerencias' }))

      expect(await screen.findByRole('dialog', { name: 'Mis sugerencias' })).toBeInTheDocument()
      expect(await screen.findByText('Ya está en los ajustes.')).toBeInTheDocument()
      expect(screen.queryByRole('dialog', { name: 'Tus avisos' })).not.toBeInTheDocument()
      expect(marcarComoLeida).toHaveBeenCalledWith('n-1')
    })

    it('abrir las sugerencias desde la tarjeta sigue empezando por el formulario', async () => {
      vi.mocked(listarNotificaciones).mockResolvedValue([aviso('n-1', { tipo: 'sugerencia_respondida' })])
      render(<App />)
      fireEvent.click(await screen.findByRole('button', { name: 'Avisos, 1 sin leer' }))
      fireEvent.click(screen.getByRole('button', { name: 'Ver mis sugerencias' }))
      await screen.findByRole('dialog', { name: 'Mis sugerencias' })
      fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

      fireEvent.click(screen.getByRole('button', { name: 'Enviar una sugerencia' }))

      expect(screen.getByRole('dialog', { name: 'Enviar una sugerencia' })).toBeInTheDocument()
    })

    it('el ascenso a staff lleva a /staff', async () => {
      const asignar = vi.fn<(url: string) => void>()
      const original = window.location
      Object.defineProperty(window, 'location', { configurable: true, value: { ...original, assign: asignar } })
      vi.mocked(listarNotificaciones).mockResolvedValue([aviso('n-1', { tipo: 'ascendido_a_staff', mensaje: 'Ahora formas parte del staff de Treeve. Ya puedes entrar al panel de staff.' })])
      try {
        render(<App />)
        fireEvent.click(await screen.findByRole('button', { name: 'Avisos, 1 sin leer' }))

        fireEvent.click(screen.getByRole('button', { name: 'Ir al panel de staff' }))

        expect(asignar).toHaveBeenCalledWith('/staff')
        expect(marcarComoLeida).toHaveBeenCalledWith('n-1')
      } finally {
        Object.defineProperty(window, 'location', { configurable: true, value: original })
      }
    })
  })
})
