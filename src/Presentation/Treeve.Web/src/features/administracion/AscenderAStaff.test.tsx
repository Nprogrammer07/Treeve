import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '../../shared/api/clienteApi.ts'
import { AscenderAStaff } from './AscenderAStaff.tsx'
import type { CambioDeRol } from './tipos.ts'

const ascendida: CambioDeRol = { usuario: 'ana.l', apodo: 'Ani', rolAnterior: 'usuario', rolNuevo: 'staff' }
const escribir = (valor: string) => fireEvent.change(screen.getByLabelText('Nombre de usuario'), { target: { value: valor } })
const enviar = () => fireEvent.click(screen.getByRole('button', { name: 'Ascender a staff' }))

describe('AscenderAStaff', () => {
  const ascender = vi.fn<(usuario: string) => Promise<CambioDeRol>>()

  beforeEach(() => {
    ascender.mockReset().mockResolvedValue(ascendida)
  })

  it('no deja enviar mientras el nombre de usuario esté vacío o sea solo espacios', () => {
    render(<AscenderAStaff ascender={ascender} onAscendida={() => {}} />)
    expect(screen.getByRole('button', { name: 'Ascender a staff' })).toBeDisabled()

    escribir('   ')

    expect(screen.getByRole('button', { name: 'Ascender a staff' })).toBeDisabled()
  })

  it('explica que se escribe el nombre de usuario exacto y que la persona recibirá un aviso', () => {
    render(<AscenderAStaff ascender={ascender} onAscendida={() => {}} />)

    expect(screen.getByText(/nombre de usuario exacto/)).toBeInTheDocument()
    expect(screen.getByText(/Recibirá un aviso/)).toBeInTheDocument()
  })

  it('envía el nombre sin espacios sobrantes', async () => {
    render(<AscenderAStaff ascender={ascender} onAscendida={() => {}} />)

    escribir('  ana.l ')
    enviar()

    await waitFor(() => expect(ascender).toHaveBeenCalledWith('ana.l'))
  })

  it('al ascender, lo cuenta con el nombre que devuelve la API, limpia el campo y avisa al panel', async () => {
    const onAscendida = vi.fn<() => void>()
    render(<AscenderAStaff ascender={ascender} onAscendida={onAscendida} />)

    escribir('ANA.L')
    enviar()

    const aviso = await screen.findByText('ana.l ahora forma parte del staff.')
    expect(aviso.tagName).toBe('OUTPUT')
    expect(screen.getByLabelText('Nombre de usuario')).toHaveValue('')
    expect(onAscendida).toHaveBeenCalledOnce()
  })

  it('si la API rechaza (400), muestra su mensaje tal cual, conserva lo escrito y no avisa al panel', async () => {
    ascender.mockRejectedValue(new ErrorApi(400, { codigo: 'VALIDACION', mensajeParaUsuario: 'No hay ninguna persona con ese nombre de usuario.' }))
    const onAscendida = vi.fn<() => void>()
    render(<AscenderAStaff ascender={ascender} onAscendida={onAscendida} />)

    escribir('nadie')
    enviar()

    expect(await screen.findByRole('alert')).toHaveTextContent('No hay ninguna persona con ese nombre de usuario.')
    expect(screen.getByLabelText('Nombre de usuario')).toHaveValue('nadie')
    expect(onAscendida).not.toHaveBeenCalled()
  })

  it('si falla sin más datos, avisa con amabilidad', async () => {
    ascender.mockRejectedValue(new TypeError('sin conexión'))
    render(<AscenderAStaff ascender={ascender} onAscendida={() => {}} />)

    escribir('ana.l')
    enviar()

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos ascender a esta persona')
  })

  it('un intento nuevo borra el mensaje de éxito o de error anterior', async () => {
    ascender.mockRejectedValueOnce(new ErrorApi(400, { codigo: 'VALIDACION', mensajeParaUsuario: 'Ya forma parte del staff.' }))
    render(<AscenderAStaff ascender={ascender} onAscendida={() => {}} />)
    escribir('ana.l')
    enviar()
    await screen.findByRole('alert')

    enviar()

    await screen.findByText('ana.l ahora forma parte del staff.')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
