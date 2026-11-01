import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useImperativeHandle, type Ref } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { guardarDesahogo } from '../features/desahogos/api.ts'
import { consultarEspacioVerde } from '../features/espacio-verde/api.ts'
import type { ControlEspacioVerde } from '../scene/EspacioVerde.tsx'
import { borrarSesion, guardarSesion } from '../shared/api/sesion.ts'
import { loteDePrueba } from '../test/loteDePrueba.ts'
import App from './App.tsx'

const escena = vi.hoisted(() => ({ regar: vi.fn<() => void>(), crecer: vi.fn<() => void>() }))

vi.mock('../scene/EspacioVerde.tsx', () => ({
  EspacioVerde: ({ etapa, nivelFlores, nivelBosque, ref }: { etapa: string; nivelFlores?: number; nivelBosque?: number; ref?: Ref<ControlEspacioVerde> }) => {
    useImperativeHandle(ref, () => escena, [])
    return <p>{`escena ${etapa} flores ${nivelFlores} bosque ${nivelBosque}`}</p>
  },
}))
vi.mock('../features/notificaciones/api.ts', () => ({ listarNotificaciones: () => Promise.resolve([]), marcarComoLeida: () => Promise.resolve() }))
vi.mock('../features/espacio-verde/api.ts', () => ({ consultarEspacioVerde: vi.fn<typeof consultarEspacioVerde>() }))
vi.mock('../features/desahogos/api.ts', () => ({ guardarDesahogo: vi.fn<typeof guardarDesahogo>() }))

async function desahogarse() {
  fireEvent.click(await screen.findByRole('button', { name: 'Desahogarme ahora' }))
  fireEvent.click(screen.getByRole('button', { name: 'Duda' }))
  fireEvent.change(screen.getByLabelText('Escribe lo que sientes'), { target: { value: 'no sé' } })
  fireEvent.click(screen.getByRole('button', { name: 'Regar mi espacio verde' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Seguir' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
}

describe('HU-07a: el espacio verde con el lote real', () => {
  beforeEach(() => {
    escena.regar.mockClear()
    escena.crecer.mockClear()
    vi.mocked(consultarEspacioVerde).mockReset().mockResolvedValue(loteDePrueba())
    vi.mocked(guardarDesahogo).mockReset().mockResolvedValue({ notaId: 'n-1', creadaEn: '2026-10-30T20:00:00-05:00', mensajeDeApoyo: { texto: 'Gracias por contarlo.', esDeCrisis: false } })
    guardarSesion({ usuarioId: 'u-1', apodo: 'Luis', token: 'token-secreto', expiraEn: '2999-01-01T00:00:00Z' })
  })

  afterEach(() => {
    borrarSesion()
  })

  it('al entrar pide el lote y dibuja la etapa y los niveles que dice la API, sin etapas provisionales', async () => {
    vi.mocked(consultarEspacioVerde).mockResolvedValue(loteDePrueba({ etapa: 'flor', niveles: { arbol: 3, flores: 4, bosque: 2 } }))
    render(<App />)

    expect(await screen.findByText('escena flor flores 4 bosque 2')).toBeInTheDocument()
    expect(consultarEspacioVerde).toHaveBeenCalledOnce()
  })

  it('muestra el progreso real: nivel de cada componente y cuántos desahogos faltan', async () => {
    render(<App />)

    expect(await screen.findByText('Te faltan 2 desahogos para que crezca el bosque.')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Progreso hacia el siguiente crecimiento' })).toHaveAttribute('value', '1')
  })

  it('mientras llega el lote no dibuja un espacio verde de mentira', async () => {
    vi.mocked(consultarEspacioVerde).mockReturnValue(new Promise(() => {}))
    render(<App />)

    expect(await screen.findByText('Cargando tu espacio verde…')).toBeInTheDocument()
    expect(screen.queryByText(/^escena/)).not.toBeInTheDocument()
  })

  it('si no se pudo cargar, avisa y al reintentar lo dibuja', async () => {
    vi.mocked(consultarEspacioVerde).mockRejectedValueOnce(new Error('caída'))
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('escena tallo flores 2 bosque 1')).toBeInTheDocument()
  })

  it('la página de visitante no pide el lote: sin sesión no hay lote que pedir', () => {
    borrarSesion()
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Cultiva tu paz interior' })).toBeInTheDocument()
    expect(consultarEspacioVerde).not.toHaveBeenCalled()
  })

  describe('después de guardar un desahogo', () => {
    it('vuelve a pedir el lote para dibujar el que ya tiene el riego', async () => {
      vi.mocked(consultarEspacioVerde).mockResolvedValueOnce(loteDePrueba()).mockResolvedValue(loteDePrueba({ riegos: 8, nutricion: 2, riegosParaElSiguiente: 1 }))
      render(<App />)

      await desahogarse()

      await waitFor(() => expect(consultarEspacioVerde).toHaveBeenCalledTimes(2))
      expect(await screen.findByText('Te falta 1 desahogo para que crezca el bosque.')).toBeInTheDocument()
    })

    it('si solo sumó nutrición, riega pero no hay animación de crecimiento', async () => {
      vi.mocked(consultarEspacioVerde).mockResolvedValueOnce(loteDePrueba()).mockResolvedValue(loteDePrueba({ riegos: 8, nutricion: 2, riegosParaElSiguiente: 1 }))
      render(<App />)

      await desahogarse()
      await screen.findByText('Te falta 1 desahogo para que crezca el bosque.')

      expect(escena.regar).toHaveBeenCalledOnce()
      expect(escena.crecer).not.toHaveBeenCalled()
      expect(screen.getByText('Tu desahogo regó tu espacio verde.').tagName).toBe('OUTPUT')
    })

    it('si algo subió de nivel, hay animación especial y aviso en palabras', async () => {
      vi.mocked(consultarEspacioVerde)
        .mockResolvedValueOnce(loteDePrueba({ nutricion: 2, riegosParaElSiguiente: 1 }))
        .mockResolvedValue(loteDePrueba({ niveles: { arbol: 2, flores: 2, bosque: 2 }, nutricion: 0, riegosParaElSiguiente: 3, siguienteEnCrecer: 'arbol' }))
      render(<App />)

      await desahogarse()

      expect(await screen.findByText('Tu desahogo regó tu espacio verde. ¡Tu espacio verde creció! El bosque subió al nivel 2.')).toBeInTheDocument()
      expect(escena.regar).toHaveBeenCalledOnce()
      expect(escena.crecer).toHaveBeenCalledOnce()
    })

    it('si el árbol cambia de etapa, lo cuenta con el nombre de la etapa', async () => {
      vi.mocked(consultarEspacioVerde)
        .mockResolvedValueOnce(loteDePrueba({ nutricion: 2, riegosParaElSiguiente: 1 }))
        .mockResolvedValue(loteDePrueba({ etapa: 'flor', niveles: { arbol: 3, flores: 2, bosque: 1 }, nutricion: 0, riegosParaElSiguiente: 3 }))
      render(<App />)

      await desahogarse()

      expect(await screen.findByText(/El árbol llegó a la etapa Flor\./)).toBeInTheDocument()
      expect(escena.crecer).toHaveBeenCalledOnce()
    })

    it('si no se puede volver a pedir el lote, igual riega y conserva el que había, sin inventar un crecimiento', async () => {
      vi.mocked(consultarEspacioVerde).mockResolvedValueOnce(loteDePrueba()).mockRejectedValue(new Error('caída'))
      render(<App />)

      await desahogarse()

      expect(escena.regar).toHaveBeenCalledOnce()
      expect(escena.crecer).not.toHaveBeenCalled()
      expect(await screen.findByText('escena tallo flores 2 bosque 1')).toBeInTheDocument()
    })
  })
})
