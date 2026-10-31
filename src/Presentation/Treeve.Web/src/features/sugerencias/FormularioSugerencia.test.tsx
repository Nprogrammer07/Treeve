import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '../../shared/api/clienteApi.ts'
import { enviarSugerencia } from './api.ts'
import { FormularioSugerencia } from './FormularioSugerencia.tsx'

vi.mock('./api.ts', () => ({ enviarSugerencia: vi.fn<typeof enviarSugerencia>() }))

const escribir = (valor: string) => fireEvent.change(screen.getByLabelText('Escribe tu sugerencia'), { target: { value: valor } })
const enviar = () => fireEvent.click(screen.getByRole('button', { name: 'Enviar sugerencia' }))

describe('FormularioSugerencia', () => {
  beforeEach(() => {
    vi.mocked(enviarSugerencia).mockReset()
    vi.mocked(enviarSugerencia).mockResolvedValue({ sugerenciaId: 's-1', creadaEn: '2026-10-26T15:00:00-05:00', estado: 'pendiente' })
  })

  it('no deja enviar una sugerencia vacía ni de solo espacios', () => {
    render(<FormularioSugerencia onEnviada={() => {}} />)
    expect(screen.getByRole('button', { name: 'Enviar sugerencia' })).toBeDisabled()

    escribir('    ')

    expect(screen.getByRole('button', { name: 'Enviar sugerencia' })).toBeDisabled()
  })

  it('cuenta los caracteres con el límite de la API (1000) y no deja pasarse', () => {
    render(<FormularioSugerencia onEnviada={() => {}} />)

    escribir('hola')

    expect(screen.getByText('4 / 1000')).toBeInTheDocument()
    expect(screen.getByLabelText('Escribe tu sugerencia')).toHaveAttribute('maxLength', '1000')
  })

  it('avisa que el equipo la verá junto con el nombre de usuario: nada oculto', () => {
    render(<FormularioSugerencia onEnviada={() => {}} />)

    expect(screen.getByText(/junto con tu nombre de usuario/)).toBeInTheDocument()
  })

  it('envía el texto y avisa cuando quedó enviada', async () => {
    const onEnviada = vi.fn<() => void>()
    render(<FormularioSugerencia onEnviada={onEnviada} />)

    escribir('Me gustaría un modo oscuro')
    enviar()

    await waitFor(() => expect(onEnviada).toHaveBeenCalledOnce())
    expect(enviarSugerencia).toHaveBeenCalledWith({ texto: 'Me gustaría un modo oscuro' })
  })

  it('si la API la rechaza (400) muestra el mensaje que ella escribió y conserva el texto', async () => {
    vi.mocked(enviarSugerencia).mockRejectedValue(new ErrorApi(400, { codigo: 'VALIDACION', mensajeParaUsuario: 'La sugerencia es demasiado larga.' }))
    const onEnviada = vi.fn<() => void>()
    render(<FormularioSugerencia onEnviada={onEnviada} />)

    escribir('mi idea')
    enviar()

    expect(await screen.findByRole('alert')).toHaveTextContent('La sugerencia es demasiado larga.')
    expect(screen.getByLabelText('Escribe tu sugerencia')).toHaveValue('mi idea')
    expect(onEnviada).not.toHaveBeenCalled()
  })

  it('si falla sin más datos, avisa con amabilidad y conserva el texto', async () => {
    vi.mocked(enviarSugerencia).mockRejectedValue(new TypeError('sin conexión'))
    render(<FormularioSugerencia onEnviada={() => {}} />)

    escribir('mi idea')
    enviar()

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos enviar tu sugerencia')
    expect(screen.getByLabelText('Escribe tu sugerencia')).toHaveValue('mi idea')
  })
})
