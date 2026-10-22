import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '../../shared/api/clienteApi.ts'
import { registrar } from './api.ts'
import { FormularioRegistro } from './FormularioRegistro.tsx'

vi.mock('./api.ts', () => ({ registrar: vi.fn<typeof registrar>() }))

function llenar(valores: Record<string, string>) {
  for (const [etiqueta, valor] of Object.entries(valores)) {
    fireEvent.change(screen.getByLabelText(new RegExp(`^${etiqueta}`)), { target: { value: valor } })
  }
}

const enviar = () => fireEvent.click(screen.getByRole('button', { name: 'Crear mi cuenta' }))
const minimos = { 'Nombre completo': '  Ana López ', Apodo: 'Ani', Usuario: 'ana.l', Contraseña: 'Treeve2026' }

describe('FormularioRegistro', () => {
  beforeEach(() => {
    vi.mocked(registrar).mockReset()
    vi.mocked(registrar).mockResolvedValue(undefined)
  })

  it('marca qué campos son obligatorios y cuáles opcionales', () => {
    render(<FormularioRegistro />)

    for (const etiqueta of ['Nombre completo', 'Apodo', 'Usuario', 'Contraseña']) {
      expect(screen.getByLabelText(new RegExp(`^${etiqueta}`))).toBeRequired()
    }
    expect(screen.getByLabelText(/^Correo electrónico/)).not.toBeRequired()
    expect(screen.getByLabelText(/^¿Por qué decidiste instalarte Treeve\?/)).not.toBeRequired()
  })

  it('con los datos mínimos envía los campos del contrato y omite los opcionales vacíos', async () => {
    render(<FormularioRegistro />)

    llenar(minimos)
    enviar()

    await waitFor(() => expect(registrar).toHaveBeenCalledOnce())
    expect(registrar).toHaveBeenCalledWith({ nombreCompleto: 'Ana López', apodo: 'Ani', nombreDeUsuario: 'ana.l', contrasena: 'Treeve2026' })
  })

  it('incluye correo y motivo si se escriben', async () => {
    render(<FormularioRegistro />)

    llenar({ ...minimos, 'Correo electrónico': 'ana@correo.com', '¿Por qué decidiste instalarte Treeve\\?': 'un espacio para mí' })
    enviar()

    await waitFor(() => expect(registrar).toHaveBeenCalledOnce())
    expect(vi.mocked(registrar).mock.calls[0]?.[0]).toMatchObject({ correo: 'ana@correo.com', motivoDeRegistro: 'un espacio para mí' })
  })

  it('no envía si no cumple las reglas, explica el problema y lleva el foco al primer campo con error', () => {
    render(<FormularioRegistro />)

    llenar({ ...minimos, Contraseña: 'corta' })
    enviar()

    expect(registrar).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/^Contraseña/)).toHaveFocus()
    expect(screen.getByLabelText(/^Contraseña/)).toHaveAccessibleDescription(/al menos una letra y un número/)
  })

  it.each(['josé', 'ñandú'])('no envía un usuario con tildes o ñ ("%s") y lo explica', (usuario) => {
    render(<FormularioRegistro />)

    llenar({ ...minimos, Usuario: usuario })
    enviar()

    expect(registrar).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/^Usuario/)).toHaveFocus()
    expect(screen.getByLabelText(/^Usuario/)).toHaveAccessibleDescription(/sin tildes ni ñ/)
  })

  it('muestra tal cual el mensaje que escribe la API (usuario o correo ya en uso)', async () => {
    vi.mocked(registrar).mockRejectedValue(new ErrorApi(400, { codigo: 'VALIDACION', mensajeParaUsuario: 'El usuario o el correo ya están en uso.' }))
    render(<FormularioRegistro />)

    llenar(minimos)
    enviar()

    expect(await screen.findByRole('alert')).toHaveTextContent('El usuario o el correo ya están en uso.')
    expect(screen.getByLabelText(/^Contraseña/)).toHaveValue('Treeve2026')
  })

  it('si falla sin mensaje de la API, avisa con amabilidad', async () => {
    vi.mocked(registrar).mockRejectedValue(new TypeError('sin conexión'))
    render(<FormularioRegistro />)

    llenar(minimos)
    enviar()

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos crear tu cuenta')
  })

  it('ofrece ir al inicio de sesión a quien ya tiene cuenta', () => {
    const onIrALogin = vi.fn<() => void>()
    render(<FormularioRegistro onIrALogin={onIrALogin} />)

    fireEvent.click(screen.getByRole('button', { name: 'Inicia sesión' }))

    expect(onIrALogin).toHaveBeenCalledOnce()
  })
})
