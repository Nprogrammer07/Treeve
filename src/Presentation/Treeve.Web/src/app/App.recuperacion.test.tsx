import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { iniciarSesion, registrar, restablecerContrasena, solicitarRecuperacion } from '../features/identidad/api.ts'
import { reiniciarLecturaDelToken } from '../features/identidad/tokenDeRecuperacion.ts'
import { borrarSesion, guardarSesion, leerSesion } from '../shared/api/sesion.ts'
import App from './App.tsx'

vi.mock('../scene/EspacioVerde.tsx', () => ({ EspacioVerde: () => <p>escena</p> }))
vi.mock('../features/identidad/api.ts', () => ({
  registrar: vi.fn<typeof registrar>(),
  iniciarSesion: vi.fn<typeof iniciarSesion>(),
  solicitarRecuperacion: vi.fn<typeof solicitarRecuperacion>(),
  restablecerContrasena: vi.fn<typeof restablecerContrasena>(),
}))

const MENSAJE = 'Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña. Revisa también la carpeta de spam.'
const navegacion = () => within(screen.getByRole('navigation', { name: 'Principal' }))

describe('HU-03b: recuperar la contraseña, de punta a punta', () => {
  beforeEach(() => {
    reiniciarLecturaDelToken()
    vi.mocked(solicitarRecuperacion).mockReset().mockResolvedValue({ mensaje: MENSAJE })
    vi.mocked(restablecerContrasena).mockReset().mockResolvedValue(undefined)
  })

  afterEach(() => {
    window.history.replaceState(null, '', '/')
    borrarSesion()
  })

  describe('pantalla 1: desde el inicio de sesión', () => {
    it('el inicio de sesión tiene el enlace "¿Olvidaste tu contraseña?" y lleva a pedir el enlace', () => {
      render(<App />)
      fireEvent.click(navegacion().getByRole('link', { name: 'Iniciar sesión' }))

      fireEvent.click(screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' }))

      expect(screen.getByRole('heading', { level: 2, name: '¿Olvidaste tu contraseña?' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Enviar enlace' })).toBeInTheDocument()
    })

    it('se pide el enlace, se muestra el mensaje de la API y se puede volver a iniciar sesión', async () => {
      render(<App />)
      fireEvent.click(navegacion().getByRole('link', { name: 'Iniciar sesión' }))
      fireEvent.click(screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' }))

      fireEvent.change(screen.getByLabelText(/^Correo electrónico/), { target: { value: 'ana@correo.com' } })
      fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }))

      expect(await screen.findByText(MENSAJE)).toBeInTheDocument()
      expect(solicitarRecuperacion).toHaveBeenCalledWith({ correo: 'ana@correo.com' })
      fireEvent.click(screen.getByRole('button', { name: 'Volver a iniciar sesión' }))
      expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
    })
  })

  describe('pantalla 2: el enlace del correo', () => {
    it('con token en /restablecer-contrasena muestra la pantalla y deja la dirección limpia', () => {
      window.history.replaceState(null, '', '/restablecer-contrasena?token=abc123')

      render(<App />)

      expect(screen.getByRole('heading', { level: 1, name: 'Elige tu contraseña nueva' })).toBeInTheDocument()
      expect(window.location.pathname).toBe('/restablecer-contrasena')
      expect(window.location.search).toBe('')
      expect(window.location.href).not.toContain('abc123')
    })

    it('al cambiar la contraseña lleva a "Iniciar sesión" con un aviso de éxito y la dirección en la raíz', async () => {
      window.history.replaceState(null, '', '/restablecer-contrasena?token=abc123')
      render(<App />)

      fireEvent.change(screen.getByLabelText(/^Contraseña nueva/), { target: { value: 'NuevaClave2026' } })
      fireEvent.change(screen.getByLabelText(/^Confirma tu contraseña/), { target: { value: 'NuevaClave2026' } })
      fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

      expect(await screen.findByRole('heading', { level: 1, name: 'Cultiva tu paz interior' })).toBeInTheDocument()
      // Hay varios avisos de estado en pantalla (sonido y éxito): el de éxito se busca por su texto y debe ser una región en vivo.
      expect(screen.getByText('Tu contraseña se cambió. Inicia sesión con la nueva.').tagName).toBe('OUTPUT')
      expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
      expect(window.location.pathname).toBe('/')
      expect(restablecerContrasena).toHaveBeenCalledWith({ token: 'abc123', contrasena: 'NuevaClave2026' })
    })

    it('si había una sesión guardada, tras cambiar la contraseña se cierra: la API cerró todas', async () => {
      guardarSesion({ usuarioId: 'u-1', apodo: 'Ani', token: 'sesion-anterior', expiraEn: '2999-01-01T00:00:00Z' })
      window.history.replaceState(null, '', '/restablecer-contrasena?token=abc123')
      render(<App />)

      fireEvent.change(screen.getByLabelText(/^Contraseña nueva/), { target: { value: 'NuevaClave2026' } })
      fireEvent.change(screen.getByLabelText(/^Confirma tu contraseña/), { target: { value: 'NuevaClave2026' } })
      fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

      await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Cultiva tu paz interior' })).toBeInTheDocument())
      expect(leerSesion()).toBeNull()
    })

    it('sin token: "El enlace no es válido" y "Pedir un enlace nuevo" lleva a la pantalla 1', () => {
      window.history.replaceState(null, '', '/restablecer-contrasena')
      render(<App />)

      expect(screen.getByRole('heading', { level: 1, name: 'El enlace no es válido' })).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Pedir un enlace nuevo' }))

      expect(screen.getByRole('heading', { level: 2, name: '¿Olvidaste tu contraseña?' })).toBeInTheDocument()
      expect(window.location.pathname).toBe('/')
    })

    it('también responde en /restablecer-contrasena/ con barra final', () => {
      window.history.replaceState(null, '', '/restablecer-contrasena/?token=abc123')

      render(<App />)

      expect(screen.getByRole('heading', { level: 1, name: 'Elige tu contraseña nueva' })).toBeInTheDocument()
    })

    it('el aviso de éxito desaparece si la persona cambia de pantalla', async () => {
      window.history.replaceState(null, '', '/restablecer-contrasena?token=abc123')
      render(<App />)
      fireEvent.change(screen.getByLabelText(/^Contraseña nueva/), { target: { value: 'NuevaClave2026' } })
      fireEvent.change(screen.getByLabelText(/^Confirma tu contraseña/), { target: { value: 'NuevaClave2026' } })
      fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
      await screen.findByText('Tu contraseña se cambió. Inicia sesión con la nueva.')

      fireEvent.click(screen.getByRole('button', { name: 'Regístrate' }))
      fireEvent.click(screen.getByRole('button', { name: 'Inicia sesión' }))

      expect(screen.queryByText('Tu contraseña se cambió. Inicia sesión con la nueva.')).not.toBeInTheDocument()
    })
  })
})
