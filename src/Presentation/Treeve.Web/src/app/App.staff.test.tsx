import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { iniciarSesion, registrar } from '../features/identidad/api.ts'
import { consultarAcceso } from '../features/panel-staff/api.ts'
import type { RolDeStaff } from '../features/panel-staff/tipos.ts'
import { ErrorApi } from '../shared/api/clienteApi.ts'
import { borrarSesion, guardarSesion } from '../shared/api/sesion.ts'
import App from './App.tsx'

vi.mock('../scene/EspacioVerde.tsx', () => ({ EspacioVerde: () => <p>escena</p> }))
vi.mock('../features/identidad/api.ts', () => ({ registrar: vi.fn<typeof registrar>(), iniciarSesion: vi.fn<typeof iniciarSesion>() }))
vi.mock('../features/panel-staff/api.ts', () => ({
  consultarAcceso: vi.fn<typeof consultarAcceso>(),
  crearFuenteDeStaff: () => ({ consultar: () => Promise.resolve({ items: [], hayMas: false }) }),
}))

const sesion = { usuarioId: 'u-1', apodo: 'Juan', token: 'token-secreto', expiraEn: '2999-01-01T00:00:00Z' }

describe('HU-10: la zona de staff vive en /staff', () => {
  beforeEach(() => {
    vi.mocked(consultarAcceso).mockReset().mockResolvedValue('staff' satisfies RolDeStaff)
    window.history.pushState({}, '', '/staff')
  })

  afterEach(() => {
    borrarSesion()
    window.history.pushState({}, '', '/')
  })

  it('sin sesión pide iniciar sesión, sin mostrar el panel ni consultar nada', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Acceso del equipo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(consultarAcceso).not.toHaveBeenCalled()
  })

  it('al iniciar sesión comprueba el acceso y muestra el panel', async () => {
    vi.mocked(iniciarSesion).mockImplementation(() => {
      guardarSesion(sesion)
      return Promise.resolve()
    })
    render(<App />)

    fireEvent.change(screen.getByLabelText(/^Usuario o correo/), { target: { value: 'juan' } })
    fireEvent.change(screen.getByLabelText(/^Contraseña/), { target: { value: 'Treeve2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Gestión de sugerencias' })).toBeInTheDocument()
    expect(consultarAcceso).toHaveBeenCalledOnce()
  })

  it('con sesión de staff muestra el panel con el apodo', async () => {
    guardarSesion(sesion)
    render(<App />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Gestión de sugerencias' })).toBeInTheDocument()
    expect(screen.getByText('Staff:')).toHaveTextContent('Staff: Juan')
  })

  it('una persona que no es staff ve "acceso denegado" y no el panel', async () => {
    vi.mocked(consultarAcceso).mockRejectedValue(new ErrorApi(403, { codigo: 'ACCESO_DENEGADO' }))
    guardarSesion(sesion)
    render(<App />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Acceso denegado' })).toBeInTheDocument()
    expect(screen.queryByText('Gestión de sugerencias')).not.toBeInTheDocument()
  })

  it('"Cerrar sesión" en el panel vuelve a pedir el inicio de sesión del equipo', async () => {
    guardarSesion(sesion)
    render(<App />)
    await screen.findByRole('heading', { level: 1, name: 'Gestión de sugerencias' })

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Acceso del equipo' })).toBeInTheDocument()
  })

  it('también responde en /staff/ con barra final', () => {
    window.history.pushState({}, '', '/staff/')
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Acceso del equipo' })).toBeInTheDocument()
  })

  it('fuera de /staff la experiencia de la persona usuaria no tiene ningún enlace al panel', () => {
    window.history.pushState({}, '', '/')
    render(<App />)

    expect(screen.queryByRole('link', { name: /staff/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /staff/i })).not.toBeInTheDocument()
    expect(consultarAcceso).not.toHaveBeenCalled()
  })
})
