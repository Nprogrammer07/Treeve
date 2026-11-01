import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '../../shared/api/clienteApi.ts'
import { ascender, listarAccesosDenegados, listarCambiosDeRol, listarEquipo, revocar } from './api.ts'
import { PanelAdministracion } from './PanelAdministracion.tsx'
import type { MiembroDelEquipo } from './tipos.ts'

vi.mock('./api.ts', () => ({
  listarEquipo: vi.fn<typeof listarEquipo>(),
  ascender: vi.fn<typeof ascender>(),
  revocar: vi.fn<typeof revocar>(),
  listarCambiosDeRol: vi.fn<typeof listarCambiosDeRol>(),
  listarAccesosDenegados: vi.fn<typeof listarAccesosDenegados>(),
}))

const equipoInicial: MiembroDelEquipo[] = [
  { id: 'u-1', usuario: 'admin.n', apodo: 'Nico', rol: 'administrador' },
  { id: 'u-2', usuario: 'ana.l', apodo: 'Ani', rol: 'staff' },
]

const panel = (extra: Partial<Parameters<typeof PanelAdministracion>[0]> = {}) => <PanelAdministracion apodo="Nico" onVolver={() => {}} onSalir={() => {}} {...extra} />

describe('PanelAdministracion', () => {
  beforeEach(() => {
    vi.mocked(listarEquipo).mockReset().mockResolvedValue(equipoInicial)
    vi.mocked(ascender).mockReset().mockResolvedValue({ usuario: 'sofi.r', apodo: 'Sofi', rolAnterior: 'usuario', rolNuevo: 'staff' })
    vi.mocked(revocar).mockReset().mockResolvedValue({ usuario: 'ana.l', apodo: 'Ani', rolAnterior: 'staff', rolNuevo: 'usuario' })
    vi.mocked(listarCambiosDeRol).mockReset().mockResolvedValue({ registros: [], hayMas: false })
    vi.mocked(listarAccesosDenegados).mockReset().mockResolvedValue({ registros: [], hayMas: false })
  })

  describe('encabezado', () => {
    it('dice que es el panel de administración y quién tiene la sesión', async () => {
      render(panel())

      expect(screen.getByText('Panel de Administración')).toBeInTheDocument()
      expect(screen.getByText('Administración:')).toHaveTextContent('Administración: Nico')
      expect(screen.getByRole('heading', { level: 1, name: 'Gestión del equipo' })).toBeInTheDocument()
      await screen.findByText('ana.l')
    })

    it('permite volver a las sugerencias y cerrar sesión', async () => {
      const onVolver = vi.fn<() => void>()
      const onSalir = vi.fn<() => void>()
      render(panel({ onVolver, onSalir }))
      await screen.findByText('ana.l')

      fireEvent.click(screen.getByRole('button', { name: 'Volver a sugerencias' }))
      fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

      expect(onVolver).toHaveBeenCalledOnce()
      expect(onSalir).toHaveBeenCalledOnce()
    })
  })

  it('muestra el equipo, el formulario para ascender y los registros', async () => {
    render(panel())

    expect(await screen.findByText('ana.l')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Añadir a alguien al staff' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Equipo actual' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Registros' })).toBeInTheDocument()
  })

  describe('ascender a alguien', () => {
    it('lo ascendido se cuenta y el equipo y los registros se vuelven a pedir', async () => {
      render(panel())
      await screen.findByText('ana.l')
      vi.mocked(listarEquipo).mockResolvedValue([...equipoInicial, { id: 'u-3', usuario: 'sofi.r', apodo: 'Sofi', rol: 'staff' }])

      fireEvent.change(screen.getByLabelText('Nombre de usuario'), { target: { value: 'sofi.r' } })
      fireEvent.click(screen.getByRole('button', { name: 'Ascender a staff' }))

      expect(await screen.findByText('sofi.r ahora forma parte del staff.')).toBeInTheDocument()
      expect(await screen.findByRole('button', { name: 'Quitar a sofi.r del staff' })).toBeInTheDocument()
      expect(ascender).toHaveBeenCalledWith('sofi.r')
      await waitFor(() => expect(listarCambiosDeRol).toHaveBeenCalledTimes(2))
    })

    it('si la API rechaza, el equipo no se vuelve a pedir', async () => {
      vi.mocked(ascender).mockRejectedValue(new ErrorApi(400, { codigo: 'VALIDACION', mensajeParaUsuario: 'Ya forma parte del staff.' }))
      render(panel())
      await screen.findByText('ana.l')

      fireEvent.change(screen.getByLabelText('Nombre de usuario'), { target: { value: 'ana.l' } })
      fireEvent.click(screen.getByRole('button', { name: 'Ascender a staff' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Ya forma parte del staff.')
      expect(listarEquipo).toHaveBeenCalledOnce()
    })
  })

  describe('quitar a alguien del staff', () => {
    it('pide confirmación antes de hacer nada', async () => {
      render(panel())
      fireEvent.click(await screen.findByRole('button', { name: 'Quitar a ana.l del staff' }))

      expect(screen.getByRole('dialog', { name: '¿Quitar a ana.l del staff?' })).toBeInTheDocument()
      expect(revocar).not.toHaveBeenCalled()
    })

    it('al confirmar, revoca por id, cierra la ventana, lo cuenta y vuelve a pedir el equipo y los registros', async () => {
      render(panel())
      fireEvent.click(await screen.findByRole('button', { name: 'Quitar a ana.l del staff' }))
      vi.mocked(listarEquipo).mockResolvedValue([equipoInicial[0] as MiembroDelEquipo])

      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Quitar del staff' }))

      expect(await screen.findByText('ana.l ya no forma parte del staff.')).toBeInTheDocument()
      expect(revocar).toHaveBeenCalledWith('u-2')
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await waitFor(() => expect(screen.queryByRole('button', { name: 'Quitar a ana.l del staff' })).not.toBeInTheDocument())
      await waitFor(() => expect(listarCambiosDeRol).toHaveBeenCalledTimes(2))
    })

    it('si cancela, no se toca nada', async () => {
      render(panel())
      fireEvent.click(await screen.findByRole('button', { name: 'Quitar a ana.l del staff' }))

      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(revocar).not.toHaveBeenCalled()
      expect(listarEquipo).toHaveBeenCalledOnce()
    })

    it('si la API rechaza, la ventana sigue abierta con su mensaje y el equipo no se vuelve a pedir', async () => {
      vi.mocked(revocar).mockRejectedValue(new ErrorApi(400, { codigo: 'VALIDACION', mensajeParaUsuario: 'El rol de esta persona cambió mientras tanto.' }))
      render(panel())
      fireEvent.click(await screen.findByRole('button', { name: 'Quitar a ana.l del staff' }))

      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Quitar del staff' }))

      expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('El rol de esta persona cambió mientras tanto.')
      expect(listarEquipo).toHaveBeenCalledOnce()
    })
  })
})
