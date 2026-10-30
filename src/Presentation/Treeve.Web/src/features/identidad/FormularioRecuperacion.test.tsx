import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '../../shared/api/clienteApi.ts'
import { solicitarRecuperacion } from './api.ts'
import { FormularioRecuperacion } from './FormularioRecuperacion.tsx'

vi.mock('./api.ts', () => ({ solicitarRecuperacion: vi.fn<typeof solicitarRecuperacion>() }))

const MENSAJE = 'Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña. Revisa también la carpeta de spam.'
const escribir = (valor: string) => fireEvent.change(screen.getByLabelText(/^Correo electrónico/), { target: { value: valor } })
const enviar = () => fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }))

describe('FormularioRecuperacion', () => {
  beforeEach(() => {
    vi.mocked(solicitarRecuperacion).mockReset()
    vi.mocked(solicitarRecuperacion).mockResolvedValue({ mensaje: MENSAJE })
  })

  it('no deja enviar mientras el correo esté vacío', () => {
    render(<FormularioRecuperacion onVolver={() => {}} />)
    expect(screen.getByRole('button', { name: 'Enviar enlace' })).toBeDisabled()

    escribir('   ')

    expect(screen.getByRole('button', { name: 'Enviar enlace' })).toBeDisabled()
  })

  it('avisa antes de enviar que solo sirve si se registró un correo', () => {
    render(<FormularioRecuperacion onVolver={() => {}} />)

    expect(screen.getByLabelText(/^Correo electrónico/)).toHaveAccessibleDescription('Solo sirve si registraste un correo en tu cuenta.')
  })

  it('envía el correo sin espacios sobrantes', async () => {
    render(<FormularioRecuperacion onVolver={() => {}} />)

    escribir('  ana@correo.com ')
    enviar()

    await waitFor(() => expect(solicitarRecuperacion).toHaveBeenCalledWith({ correo: 'ana@correo.com' }))
  })

  it('al recibir el 202 muestra siempre el mensaje de la API, tal cual, y nada más', async () => {
    render(<FormularioRecuperacion onVolver={() => {}} />)

    escribir('ana@correo.com')
    enviar()

    const aviso = await screen.findByText(MENSAJE)
    expect(aviso.tagName).toBe('OUTPUT')
    // La respuesta es idéntica exista o no el correo: la interfaz no puede delatar cuál fue el caso.
    expect(document.body.textContent).not.toMatch(/correo enviado|se envió|no se encontr|no existe|no está registrado\b/i)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('muestra el mismo mensaje sin importar el correo que se escriba', async () => {
    const { unmount } = render(<FormularioRecuperacion onVolver={() => {}} />)
    escribir('existe@correo.com')
    enviar()
    const primero = (await screen.findByText(MENSAJE)).textContent
    unmount()

    render(<FormularioRecuperacion onVolver={() => {}} />)
    escribir('noexiste@correo.com')
    enviar()
    const segundo = (await screen.findByText(MENSAJE)).textContent

    expect(segundo).toBe(primero)
  })

  it('desactiva el botón unos segundos después de enviar y luego lo vuelve a activar', async () => {
    render(<FormularioRecuperacion onVolver={() => {}} esperaMs={60} />)

    escribir('ana@correo.com')
    enviar()
    await screen.findByText(MENSAJE)

    expect(screen.getByRole('button', { name: 'Enviar enlace' })).toBeDisabled()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Enviar enlace' })).toBeEnabled())
  })

  it('si la API dice 400 (vacío o no parece un correo), muestra su mensaje', async () => {
    vi.mocked(solicitarRecuperacion).mockRejectedValue(new ErrorApi(400, { codigo: 'VALIDACION', mensajeParaUsuario: 'Escribe un correo válido.' }))
    render(<FormularioRecuperacion onVolver={() => {}} />)

    escribir('no-es-correo')
    enviar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Escribe un correo válido.')
  })

  it('si falla sin más datos, avisa con amabilidad', async () => {
    vi.mocked(solicitarRecuperacion).mockRejectedValue(new TypeError('sin conexión'))
    render(<FormularioRecuperacion onVolver={() => {}} />)

    escribir('ana@correo.com')
    enviar()

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos enviar la solicitud')
  })

  it('permite volver a iniciar sesión', () => {
    const onVolver = vi.fn<() => void>()
    render(<FormularioRecuperacion onVolver={onVolver} />)

    fireEvent.click(screen.getByRole('button', { name: 'Volver a iniciar sesión' }))

    expect(onVolver).toHaveBeenCalledOnce()
  })
})
