import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { guardarDesahogo } from './api.ts'
import { FlujoDesahogo } from './FlujoDesahogo.tsx'
import type { CrearNotaResponse } from './tipos.ts'

vi.mock('./api.ts', () => ({ guardarDesahogo: vi.fn<typeof guardarDesahogo>() }))

const respuesta = (texto: string, esDeCrisis = false): CrearNotaResponse => ({
  notaId: 'n-1',
  creadaEn: '2026-10-22T20:00:00-05:00',
  mensajeDeApoyo: { texto, esDeCrisis },
})

const flujo = (extra: Partial<Parameters<typeof FlujoDesahogo>[0]> = {}) => (
  <FlujoDesahogo abierto onCerrar={() => {}} alGuardar={() => {}} {...extra} />
)

function desahogarse(emocion = 'Duda', texto = 'no sé qué hacer') {
  fireEvent.click(screen.getByRole('button', { name: emocion }))
  fireEvent.change(screen.getByLabelText('Escribe lo que sientes'), { target: { value: texto } })
  fireEvent.click(screen.getByRole('button', { name: 'Regar mi espacio verde' }))
}

describe('FlujoDesahogo', () => {
  beforeEach(() => {
    vi.mocked(guardarDesahogo).mockReset()
    vi.mocked(guardarDesahogo).mockResolvedValue(respuesta('Hola, Ani. Gracias por contarlo.'))
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

  describe('HU-06: el mensaje de apoyo', () => {
    it('al guardar envía la emoción y el texto y muestra el mensaje de la API en una ventana propia', async () => {
      const alGuardar = vi.fn<() => void>()
      render(flujo({ alGuardar }))

      desahogarse('Duda', 'no sé qué hacer')

      const dialogo = await screen.findByRole('dialog', { name: 'Un mensaje para ti' })
      expect(within(dialogo).getByText('Hola, Ani. Gracias por contarlo.')).toBeInTheDocument()
      expect(guardarDesahogo).toHaveBeenCalledWith({ emocion: 'duda', texto: 'no sé qué hacer' })
      // Todavía no se riega: primero la persona lee su mensaje.
      expect(alGuardar).not.toHaveBeenCalled()
    })

    it('"Seguir" cierra el mensaje y avisa que el desahogo quedó guardado', async () => {
      const alGuardar = vi.fn<() => void>()
      const onCerrar = vi.fn<() => void>()
      render(flujo({ alGuardar, onCerrar }))
      desahogarse()

      fireEvent.click(await screen.findByRole('button', { name: 'Seguir' }))

      expect(alGuardar).toHaveBeenCalledOnce()
      expect(onCerrar).not.toHaveBeenCalled()
    })

    it('cerrar el mensaje con la X también avisa que se guardó: el desahogo ya existe', async () => {
      const alGuardar = vi.fn<() => void>()
      const onCerrar = vi.fn<() => void>()
      render(flujo({ alGuardar, onCerrar }))
      desahogarse()
      await screen.findByRole('dialog', { name: 'Un mensaje para ti' })

      fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

      expect(alGuardar).toHaveBeenCalledOnce()
      expect(onCerrar).not.toHaveBeenCalled()
    })

    it('cerrar el mensaje con Esc (cierre nativo) también avisa que se guardó', async () => {
      const alGuardar = vi.fn<() => void>()
      render(flujo({ alGuardar }))
      desahogarse()

      fireEvent(await screen.findByRole('dialog', { name: 'Un mensaje para ti' }), new Event('close'))

      expect(alGuardar).toHaveBeenCalledOnce()
    })

    it('un mensaje de crisis se muestra completo y no se cierra solo', async () => {
      vi.mocked(guardarDesahogo).mockResolvedValue(respuesta('Estamos contigo. TODO: verificar líneas de ayuda de Colombia', true))
      const alGuardar = vi.fn<() => void>()
      render(flujo({ alGuardar }))

      desahogarse('Tristeza', 'me siento muy mal')

      expect(await screen.findByText(/Estamos contigo/)).toBeInTheDocument()
      await new Promise((resolver) => setTimeout(resolver, 30))
      expect(screen.getByRole('dialog', { name: 'Un mensaje para ti' })).toBeInTheDocument()
      expect(alGuardar).not.toHaveBeenCalled()
    })

    it('si no se pudo guardar no hay mensaje: la persona sigue en la hoja con lo que escribió', async () => {
      vi.mocked(guardarDesahogo).mockRejectedValue(new Error('caída'))
      render(flujo())

      desahogarse('Miedo', 'tengo miedo')

      expect(await screen.findByRole('alert')).toBeInTheDocument()
      expect(screen.queryByRole('dialog', { name: 'Un mensaje para ti' })).not.toBeInTheDocument()
      expect(screen.getByLabelText('Escribe lo que sientes')).toHaveValue('tengo miedo')
    })
  })

  it('se puede cerrar sin guardar', () => {
    const onCerrar = vi.fn<() => void>()
    const alGuardar = vi.fn<() => void>()
    render(flujo({ onCerrar, alGuardar }))

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(onCerrar).toHaveBeenCalledOnce()
    expect(alGuardar).not.toHaveBeenCalled()
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

  it('al volver a abrir después de ver un mensaje, no queda el mensaje anterior', async () => {
    const { rerender } = render(flujo())
    desahogarse()
    await screen.findByText('Hola, Ani. Gracias por contarlo.')

    rerender(flujo({ abierto: false }))
    rerender(flujo({ abierto: true }))

    expect(screen.queryByText('Hola, Ani. Gracias por contarlo.')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('dialog', { name: '¿Cómo te sientes hoy?' })).toBeInTheDocument())
  })
})
