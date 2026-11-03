import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ascender, listarAccesosDenegados, listarCambiosDeRol, listarEquipo, revocar } from '../features/administracion/api.ts'
import { consultarAcceso } from '../features/panel-staff/api.ts'
import type { RolDeStaff } from '../features/panel-staff/tipos.ts'
import { borrarSesion, guardarSesion } from '../shared/api/sesion.ts'
import App from './App.tsx'

vi.mock('../scene/EspacioVerde.tsx', () => ({ EspacioVerde: () => <p>escena</p> }))
vi.mock('../features/panel-staff/api.ts', () => ({
  consultarAcceso: vi.fn<typeof consultarAcceso>(),
  crearFuenteDeStaff: () => ({ consultar: () => Promise.resolve({ items: [], hayMas: false }) }),
}))
vi.mock('../features/administracion/api.ts', () => ({
  listarEquipo: vi.fn<typeof listarEquipo>(),
  ascender: vi.fn<typeof ascender>(),
  revocar: vi.fn<typeof revocar>(),
  listarCambiosDeRol: vi.fn<typeof listarCambiosDeRol>(),
  listarAccesosDenegados: vi.fn<typeof listarAccesosDenegados>(),
}))

const sesion = { usuarioId: 'u-1', apodo: 'Nico', token: 'token-secreto', expiraEn: '2999-01-01T00:00:00Z' }

/** jsdom no navega: se sustituye location.assign para ver a dónde se pediría ir. */
function espiarNavegacion() {
  const asignar = vi.fn<(url: string) => void>()
  const original = window.location
  Object.defineProperty(window, 'location', { configurable: true, value: { ...original, assign: asignar } })
  return { asignar, restaurar: () => Object.defineProperty(window, 'location', { configurable: true, value: original }) }
}

describe('HU-12: la zona de administración vive en /staff/administracion', () => {
  beforeEach(() => {
    vi.mocked(consultarAcceso).mockReset().mockResolvedValue('administrador' satisfies RolDeStaff)
    vi.mocked(listarEquipo).mockReset().mockResolvedValue([{ id: 'u-1', usuario: 'admin.n', apodo: 'Nico', rol: 'administrador' }])
    vi.mocked(listarCambiosDeRol).mockReset().mockResolvedValue({ registros: [], hayMas: false })
    vi.mocked(listarAccesosDenegados).mockReset().mockResolvedValue({ registros: [], hayMas: false })
    window.history.pushState({}, '', '/staff/administracion')
  })

  afterEach(() => {
    borrarSesion()
    window.history.pushState({}, '', '/')
  })

  describe('/staff/administracion', () => {
    it('sin sesión pide iniciar sesión, sin mostrar nada ni consultar nada', () => {
      render(<App />)

      expect(screen.getByRole('heading', { level: 1, name: 'Acceso del equipo' })).toBeInTheDocument()
      expect(consultarAcceso).not.toHaveBeenCalled()
      expect(listarEquipo).not.toHaveBeenCalled()
    })

    it('con sesión de administración muestra el panel con su apodo', async () => {
      guardarSesion(sesion)
      render(<App />)

      expect(await screen.findByRole('heading', { level: 1, name: 'Gestión del equipo' })).toBeInTheDocument()
      expect(screen.getByText('Administración:')).toHaveTextContent('Administración: Nico')
      expect(await screen.findByText('admin.n')).toBeInTheDocument()
    })

    it('una persona de staff ve "acceso denegado" y no el panel', async () => {
      vi.mocked(consultarAcceso).mockResolvedValue('staff')
      guardarSesion(sesion)
      render(<App />)

      expect(await screen.findByRole('heading', { level: 1, name: 'Acceso denegado' })).toBeInTheDocument()
      expect(screen.queryByText('Gestión del equipo')).not.toBeInTheDocument()
      expect(listarEquipo).not.toHaveBeenCalled()
    })

    it('"Cerrar sesión" vuelve a pedir el inicio de sesión del equipo', async () => {
      guardarSesion(sesion)
      render(<App />)
      await screen.findByRole('heading', { level: 1, name: 'Gestión del equipo' })

      fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

      expect(screen.getByRole('heading', { level: 1, name: 'Acceso del equipo' })).toBeInTheDocument()
    })

    it('"Volver a sugerencias" lleva a /staff', async () => {
      const { asignar, restaurar } = espiarNavegacion()
      guardarSesion(sesion)
      try {
        render(<App />)
        await screen.findByRole('heading', { level: 1, name: 'Gestión del equipo' })

        fireEvent.click(screen.getByRole('button', { name: 'Volver a sugerencias' }))

        expect(asignar).toHaveBeenCalledWith('/staff')
      } finally {
        restaurar()
      }
    })

    it('también responde con barra final', async () => {
      window.history.pushState({}, '', '/staff/administracion/')
      guardarSesion(sesion)
      render(<App />)

      expect(await screen.findByRole('heading', { level: 1, name: 'Gestión del equipo' })).toBeInTheDocument()
    })
  })

  describe('el camino desde el panel de staff (/staff)', () => {
    beforeEach(() => {
      window.history.pushState({}, '', '/staff')
    })

    it('a la administración se le ofrece "Panel de Administración" y lleva a /staff/administracion', async () => {
      const { asignar, restaurar } = espiarNavegacion()
      guardarSesion(sesion)
      try {
        render(<App />)

        fireEvent.click(await screen.findByRole('button', { name: 'Panel de Administración' }))

        expect(asignar).toHaveBeenCalledWith('/staff/administracion')
      } finally {
        restaurar()
      }
    })

    it('a una persona de staff no se le ofrece', async () => {
      vi.mocked(consultarAcceso).mockResolvedValue('staff')
      guardarSesion(sesion)
      render(<App />)

      await screen.findByRole('heading', { level: 1, name: 'Gestión de sugerencias' })
      expect(screen.queryByRole('button', { name: 'Panel de Administración' })).not.toBeInTheDocument()
    })
  })

  it('la experiencia de la persona usuaria no tiene ningún enlace a la administración', () => {
    window.history.pushState({}, '', '/')
    render(<App />)

    expect(screen.queryByRole('link', { name: /administraci/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /administraci/i })).not.toBeInTheDocument()
    expect(consultarAcceso).not.toHaveBeenCalled()
  })
})
