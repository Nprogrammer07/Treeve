import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { guardarDesahogo } from '../features/desahogos/api.ts'
import { iniciarSesion, registrar } from '../features/identidad/api.ts'
import { borrarSesion, guardarSesion } from '../shared/api/sesion.ts'
import App from './App.tsx'

vi.mock('../scene/EspacioVerde.tsx', () => ({ EspacioVerde: () => <p>escena</p> }))
vi.mock('../features/desahogos/api.ts', () => ({
  guardarDesahogo: vi.fn<typeof guardarDesahogo>().mockResolvedValue({ notaId: 'n-1', creadaEn: '2026-10-20T20:00:00-05:00' }),
}))
vi.mock('../features/identidad/api.ts', () => ({
  registrar: vi.fn<typeof registrar>(),
  iniciarSesion: vi.fn<typeof iniciarSesion>(),
}))

const sesion = { usuarioId: 'u-1', apodo: 'Ani', token: 'token-secreto', expiraEn: '2999-01-01T00:00:00Z' }
const navegacion = () => within(screen.getByRole('navigation', { name: 'Principal' }))

afterEach(() => {
  borrarSesion()
})

describe('App', () => {
  it('sin sesión abre la página de visitante con el registro y el sonido ambiental', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Cultiva tu paz interior' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear mi cuenta' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('En silencio')
  })

  it('"Iniciar sesión" cambia el formulario y se puede volver al registro', () => {
    render(<App />)

    fireEvent.click(navegacion().getByRole('link', { name: 'Iniciar sesión' }))
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Regístrate' }))

    expect(screen.getByRole('button', { name: 'Crear mi cuenta' })).toBeInTheDocument()
  })

  it('al registrarse queda con la sesión abierta y pasa a elegir emoción', async () => {
    vi.mocked(registrar).mockImplementation(() => {
      guardarSesion(sesion)
      return Promise.resolve()
    })
    render(<App />)

    fireEvent.change(screen.getByLabelText(/^Nombre completo/), { target: { value: 'Ana López' } })
    fireEvent.change(screen.getByLabelText(/^Apodo/), { target: { value: 'Ani' } })
    fireEvent.change(screen.getByLabelText(/^Usuario/), { target: { value: 'ana.l' } })
    fireEvent.change(screen.getByLabelText(/^Contraseña/), { target: { value: 'Treeve2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear mi cuenta' }))

    expect(await screen.findByRole('radio', { name: 'Tristeza' })).toBeInTheDocument()
    expect(screen.getByText('Hola, Ani')).toBeInTheDocument()
  })

  it('al iniciar sesión pasa a elegir emoción', async () => {
    vi.mocked(iniciarSesion).mockImplementation(() => {
      guardarSesion(sesion)
      return Promise.resolve()
    })
    render(<App />)

    fireEvent.click(navegacion().getByRole('link', { name: 'Iniciar sesión' }))
    fireEvent.change(screen.getByLabelText(/^Usuario o correo/), { target: { value: 'ana.l' } })
    fireEvent.change(screen.getByLabelText(/^Contraseña/), { target: { value: 'Treeve2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByRole('radio', { name: 'Tristeza' })).toBeInTheDocument()
  })

  it('con una sesión guardada en la pestaña entra directo, sin pasar por la página de visitante', () => {
    guardarSesion(sesion)

    render(<App />)

    expect(screen.getByRole('radio', { name: 'Tristeza' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Crear mi cuenta' })).not.toBeInTheDocument()
  })

  it('"Salir" vuelve a la página de visitante', () => {
    guardarSesion(sesion)
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Salir' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Cultiva tu paz interior' })).toBeInTheDocument()
  })

  it('después de guardar un desahogo muestra el espacio verde regado', async () => {
    guardarSesion(sesion)
    render(<App />)

    fireEvent.click(screen.getByRole('radio', { name: 'Duda' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.change(screen.getByLabelText('Escribe lo que sientes'), { target: { value: 'no sé' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Tu espacio verde' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Tu desahogo regó tu espacio verde.')
  })
})
