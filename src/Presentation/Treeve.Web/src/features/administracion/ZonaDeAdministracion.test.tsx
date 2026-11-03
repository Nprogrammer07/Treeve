import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '../../shared/api/clienteApi.ts'
import { ascender, listarAccesosDenegados, listarCambiosDeRol, listarEquipo, revocar } from './api.ts'
import { ZonaDeAdministracion } from './ZonaDeAdministracion.tsx'

vi.mock('./api.ts', () => ({
  listarEquipo: vi.fn<typeof listarEquipo>().mockResolvedValue([{ id: 'u-1', usuario: 'admin.n', apodo: 'Nico', rol: 'administrador' }]),
  ascender: vi.fn<typeof ascender>(),
  revocar: vi.fn<typeof revocar>(),
  listarCambiosDeRol: vi.fn<typeof listarCambiosDeRol>().mockResolvedValue({ registros: [], hayMas: false }),
  listarAccesosDenegados: vi.fn<typeof listarAccesosDenegados>().mockResolvedValue({ registros: [], hayMas: false }),
}))

type Rol = 'staff' | 'administrador'
const zona = (comprobar: () => Promise<Rol>, extra: Partial<Parameters<typeof ZonaDeAdministracion>[0]> = {}) => (
  <ZonaDeAdministracion comprobarAcceso={comprobar} apodo="Nico" onSalir={() => {}} onVolverASugerencias={() => {}} onVolverAlInicio={() => {}} {...extra} />
)

describe('ZonaDeAdministracion', () => {
  it('mientras comprueba el acceso no muestra el panel', () => {
    render(zona(() => new Promise(() => {})))

    expect(screen.getByText('Comprobando tu acceso…')).toBeInTheDocument()
    expect(screen.queryByText('Gestión del equipo')).not.toBeInTheDocument()
  })

  it('si la API dice que es administración, muestra el panel', async () => {
    render(zona(() => Promise.resolve('administrador')))

    expect(await screen.findByRole('heading', { level: 1, name: 'Gestión del equipo' })).toBeInTheDocument()
  })

  it('una persona de staff ve "acceso denegado" y la pantalla no llama a /api/admin (no deja un intento en el registro)', async () => {
    vi.mocked(listarEquipo).mockClear()
    const onVolverASugerencias = vi.fn<() => void>()
    render(zona(() => Promise.resolve('staff'), { onVolverASugerencias }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Acceso denegado' })).toBeInTheDocument()
    expect(screen.queryByText('Gestión del equipo')).not.toBeInTheDocument()
    expect(listarEquipo).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Volver al panel de staff' }))
    expect(onVolverASugerencias).toHaveBeenCalledOnce()
  })

  it('quien no es ni staff (403) ve "acceso denegado" y solo puede volver al inicio o cerrar sesión', async () => {
    const onVolverAlInicio = vi.fn<() => void>()
    const onSalir = vi.fn<() => void>()
    render(zona(() => Promise.reject(new ErrorApi(403, { codigo: 'ACCESO_DENEGADO' })), { onVolverAlInicio, onSalir }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Acceso denegado' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Volver al panel de staff' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Volver a Treeve' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(onVolverAlInicio).toHaveBeenCalledOnce()
    expect(onSalir).toHaveBeenCalledOnce()
  })

  it('si la comprobación falla por otra causa, avisa con amabilidad y permite reintentar', async () => {
    const comprobar = vi.fn<() => Promise<Rol>>().mockRejectedValueOnce(new ErrorApi(500)).mockResolvedValue('administrador')
    render(zona(comprobar))

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos comprobar tu acceso')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Gestión del equipo' })).toBeInTheDocument()
  })
})
