import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '../../shared/api/clienteApi.ts'
import { iniciarSesion } from './api.ts'
import { FormularioLogin } from './FormularioLogin.tsx'

vi.mock('./api.ts', () => ({ iniciarSesion: vi.fn<typeof iniciarSesion>() }))

function llenar(identificador: string, contrasena: string) {
  fireEvent.change(screen.getByLabelText(/^Usuario o correo/), { target: { value: identificador } })
  fireEvent.change(screen.getByLabelText(/^Contraseña/), { target: { value: contrasena } })
}

const enviar = () => fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

describe('FormularioLogin', () => {
  beforeEach(() => {
    vi.mocked(iniciarSesion).mockReset()
    vi.mocked(iniciarSesion).mockResolvedValue(undefined)
  })

  it('envía el identificador y la contraseña', async () => {
    render(<FormularioLogin />)

    llenar('  ana.l ', 'Treeve2026')
    enviar()

    await waitFor(() => expect(iniciarSesion).toHaveBeenCalledOnce())
    expect(iniciarSesion).toHaveBeenCalledWith({ identificador: 'ana.l', contrasena: 'Treeve2026' })
  })

  it('no envía si falta un dato y lleva el foco al campo con error', () => {
    render(<FormularioLogin />)

    enviar()

    expect(iniciarSesion).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/^Usuario o correo/)).toHaveFocus()
    expect(screen.getByLabelText(/^Usuario o correo/)).toHaveAccessibleDescription('Escribe tu usuario o tu correo.')
  })

  it('con credenciales incorrectas muestra el mensaje de la API, que no dice qué dato falló', async () => {
    vi.mocked(iniciarSesion).mockRejectedValue(new ErrorApi(401, { codigo: 'CREDENCIALES_INVALIDAS', mensajeParaUsuario: 'Usuario o contraseña incorrectos.' }))
    render(<FormularioLogin />)

    llenar('ana.l', 'mala')
    enviar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Usuario o contraseña incorrectos.')
  })

  it('con la cuenta bloqueada muestra el mensaje de la API con el tiempo de espera', async () => {
    vi.mocked(iniciarSesion).mockRejectedValue(
      new ErrorApi(429, { codigo: 'CUENTA_BLOQUEADA', mensajeParaUsuario: 'Cuenta bloqueada. Intenta de nuevo en 15 minuto(s).', reintentarEnSeg: 900 }),
    )
    render(<FormularioLogin />)

    llenar('ana.l', 'Treeve2026')
    enviar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Intenta de nuevo en 15 minuto(s).')
  })

  it('si falla sin mensaje de la API, avisa con amabilidad', async () => {
    vi.mocked(iniciarSesion).mockRejectedValue(new TypeError('sin conexión'))
    render(<FormularioLogin />)

    llenar('ana.l', 'Treeve2026')
    enviar()

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos iniciar sesión')
  })

  it('ofrece ir al registro a quien todavía no tiene cuenta', () => {
    const onIrARegistro = vi.fn<() => void>()
    render(<FormularioLogin onIrARegistro={onIrARegistro} />)

    fireEvent.click(screen.getByRole('button', { name: 'Regístrate' }))

    expect(onIrARegistro).toHaveBeenCalledOnce()
  })

  it('HU-03b: ofrece "¿Olvidaste tu contraseña?" solo si se le da a dónde llevar', () => {
    const onOlvidoContrasena = vi.fn<() => void>()
    const { unmount } = render(<FormularioLogin />)
    expect(screen.queryByRole('button', { name: '¿Olvidaste tu contraseña?' })).not.toBeInTheDocument()
    unmount()

    render(<FormularioLogin onOlvidoContrasena={onOlvidoContrasena} />)
    fireEvent.click(screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' }))

    expect(onOlvidoContrasena).toHaveBeenCalledOnce()
  })

  it('HU-03b: muestra en una región en vivo el aviso de éxito que le llega de otra pantalla', () => {
    render(<FormularioLogin aviso="Tu contraseña se cambió. Inicia sesión con la nueva." />)

    expect(screen.getByRole('status')).toHaveTextContent('Tu contraseña se cambió. Inicia sesión con la nueva.')
  })
})
