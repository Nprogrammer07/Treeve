import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '../../shared/api/clienteApi.ts'
import { ConfirmarRevocacion } from './ConfirmarRevocacion.tsx'
import type { CambioDeRol, MiembroDelEquipo } from './tipos.ts'

const ana: MiembroDelEquipo = { id: 'u-2', usuario: 'ana.l', apodo: 'Ani', rol: 'staff' }
const revocada: CambioDeRol = { usuario: 'ana.l', apodo: 'Ani', rolAnterior: 'staff', rolNuevo: 'usuario' }

describe('ConfirmarRevocacion', () => {
  const revocar = vi.fn<(id: string) => Promise<CambioDeRol>>()

  const ventana = (extra: Partial<Parameters<typeof ConfirmarRevocacion>[0]> = {}) => <ConfirmarRevocacion miembro={ana} revocar={revocar} onCerrar={() => {}} onRevocada={() => {}} {...extra} />

  beforeEach(() => {
    revocar.mockReset().mockResolvedValue(revocada)
  })

  it('sin persona elegida no muestra nada', () => {
    render(ventana({ miembro: null }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('pregunta por la persona y explica las consecuencias, sin pedir nada más', () => {
    render(ventana())

    const dialogo = screen.getByRole('dialog', { name: '¿Quitar a ana.l del staff?' })
    expect(within(dialogo).getByText(/Volverá a ser una persona usuaria regular desde su siguiente petición/)).toBeInTheDocument()
    expect(within(dialogo).getByText(/Recibirá un aviso/)).toBeInTheDocument()
    expect(within(dialogo).getByText(/no se puede modificar ni borrar/)).toBeInTheDocument()
  })

  it('"Cancelar" y la X cierran sin llamar a la API', () => {
    const onCerrar = vi.fn<() => void>()
    render(ventana({ onCerrar }))

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(onCerrar).toHaveBeenCalledTimes(2)
    expect(revocar).not.toHaveBeenCalled()
  })

  it('al confirmar revoca por el id de la persona (no por su nombre) y entrega el resultado', async () => {
    const onRevocada = vi.fn<(r: CambioDeRol) => void>()
    render(ventana({ onRevocada }))

    fireEvent.click(screen.getByRole('button', { name: 'Quitar del staff' }))

    await waitFor(() => expect(onRevocada).toHaveBeenCalledWith(revocada))
    expect(revocar).toHaveBeenCalledWith('u-2')
  })

  it('si la API rechaza (400), muestra su mensaje tal cual y la ventana sigue abierta', async () => {
    revocar.mockRejectedValue(new ErrorApi(400, { codigo: 'VALIDACION', mensajeParaUsuario: 'El rol de esta persona cambió mientras tanto.' }))
    const onRevocada = vi.fn<(r: CambioDeRol) => void>()
    render(ventana({ onRevocada }))

    fireEvent.click(screen.getByRole('button', { name: 'Quitar del staff' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El rol de esta persona cambió mientras tanto.')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(onRevocada).not.toHaveBeenCalled()
  })

  it('si falla sin más datos, avisa con amabilidad', async () => {
    revocar.mockRejectedValue(new TypeError('sin conexión'))
    render(ventana())

    fireEvent.click(screen.getByRole('button', { name: 'Quitar del staff' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos quitar a esta persona del staff')
  })

  it('al elegir a otra persona, el aviso de error de la anterior no se arrastra', async () => {
    revocar.mockRejectedValueOnce(new ErrorApi(400, { codigo: 'VALIDACION', mensajeParaUsuario: 'Error de ana.' }))
    const { rerender } = render(ventana())
    fireEvent.click(screen.getByRole('button', { name: 'Quitar del staff' }))
    await screen.findByRole('alert')

    rerender(ventana({ miembro: { id: 'u-3', usuario: 'juanj', apodo: 'Juan', rol: 'staff' } }))

    expect(screen.getByRole('dialog', { name: '¿Quitar a juanj del staff?' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
