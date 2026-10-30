import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '../../shared/api/clienteApi.ts'
import { guardarDesahogo } from './api.ts'
import { HojaDePapel } from './HojaDePapel.tsx'
import type { CrearNotaResponse } from './tipos.ts'

vi.mock('./api.ts', () => ({
  guardarDesahogo: vi.fn<typeof guardarDesahogo>(),
}))

const MENSAJE = { texto: 'Hola, Ani. Gracias por contarlo.', esDeCrisis: false }
const guardada: CrearNotaResponse = { notaId: 'n-1', creadaEn: '2026-10-14T22:30:00-05:00', mensajeDeApoyo: MENSAJE }

const escribir = (valor: string) =>
  fireEvent.change(screen.getByLabelText('Escribe lo que sientes'), { target: { value: valor } })
const guardar = () => fireEvent.click(screen.getByRole('button', { name: 'Regar mi espacio verde' }))

describe('HojaDePapel', () => {
  beforeEach(() => {
    vi.mocked(guardarDesahogo).mockReset()
    vi.mocked(guardarDesahogo).mockResolvedValue(guardada)
  })

  it('no deja guardar una hoja vacía', () => {
    render(<HojaDePapel emocion="tristeza" onGuardado={() => {}} />)

    expect(screen.getByRole('button', { name: 'Regar mi espacio verde' })).toBeDisabled()
  })

  it('invita a escribir con el texto del diseño y no exige otra cosa que escribir', () => {
    render(<HojaDePapel emocion="duda" onGuardado={() => {}} />)

    expect(screen.getByPlaceholderText('Hoy me sentí...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Regar mi espacio verde' })).toBeDisabled()
  })

  it('no deja guardar una hoja con solo espacios', () => {
    render(<HojaDePapel emocion="tristeza" onGuardado={() => {}} />)

    escribir('   ')

    expect(screen.getByRole('button', { name: 'Regar mi espacio verde' })).toBeDisabled()
  })

  it('muestra cuántos caracteres lleva', () => {
    render(<HojaDePapel emocion="tristeza" onGuardado={() => {}} />)

    escribir('hola')

    expect(screen.getByText('4 / 2000')).toBeInTheDocument()
  })

  it('envía la emoción y el texto y entrega el mensaje de apoyo que devuelve la API', async () => {
    const onGuardado = vi.fn<(mensaje: unknown) => void>()
    render(<HojaDePapel emocion="rabia" onGuardado={onGuardado} />)

    escribir('texto de prueba')
    guardar()

    await waitFor(() => expect(onGuardado).toHaveBeenCalledOnce())
    expect(guardarDesahogo).toHaveBeenCalledWith({ emocion: 'rabia', texto: 'texto de prueba' })
    expect(onGuardado).toHaveBeenCalledWith(MENSAJE)
  })

  it('si falla sin más datos, avisa con amabilidad y conserva lo escrito', async () => {
    vi.mocked(guardarDesahogo).mockRejectedValue(new Error('caída'))
    const onGuardado = vi.fn<(mensaje: unknown) => void>()
    render(<HojaDePapel emocion="duda" onGuardado={onGuardado} />)

    escribir('esto no se debe perder')
    guardar()

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos guardar tu desahogo')
    expect(screen.getByLabelText('Escribe lo que sientes')).toHaveValue('esto no se debe perder')
    expect(onGuardado).not.toHaveBeenCalled()
  })

  it('si la API rechaza el desahogo (400), muestra el mensaje que ella escribió', async () => {
    vi.mocked(guardarDesahogo).mockRejectedValue(new ErrorApi(400, { codigo: 'VALIDACION', mensajeParaUsuario: 'Elige una emoción: tristeza, rabia, miedo, duda o felicidad.' }))
    render(<HojaDePapel emocion="duda" onGuardado={() => {}} />)

    escribir('algo')
    guardar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Elige una emoción')
  })

  it('si el servidor falla (5xx) advierte que pudo guardarse y que repetir podría duplicarlo, con el código de seguimiento', async () => {
    vi.mocked(guardarDesahogo).mockRejectedValue(new ErrorApi(500, { correlacionId: 'abc-123' }))
    render(<HojaDePapel emocion="miedo" onGuardado={() => {}} />)

    escribir('mi desahogo')
    guardar()

    const aviso = await screen.findByRole('alert')
    expect(aviso).toHaveTextContent('Es posible que sí haya quedado guardado')
    expect(aviso).toHaveTextContent('podría guardarse dos veces')
    expect(aviso).toHaveTextContent('Código de seguimiento: abc-123')
    expect(screen.getByLabelText('Escribe lo que sientes')).toHaveValue('mi desahogo')
  })

  it('un error 5xx sin código de seguimiento no inventa uno', async () => {
    vi.mocked(guardarDesahogo).mockRejectedValue(new ErrorApi(503))
    render(<HojaDePapel emocion="miedo" onGuardado={() => {}} />)

    escribir('mi desahogo')
    guardar()

    expect(await screen.findByRole('alert')).not.toHaveTextContent('Código de seguimiento')
  })

  describe('privacidad: el texto del desahogo y el mensaje de apoyo no quedan en el navegador', () => {
    const SECRETO = 'texto-muy-privado-8731'

    function almacenamientoContiene(texto: string) {
      return [window.localStorage, window.sessionStorage].some((almacen) =>
        Object.keys(almacen).some((clave) => clave.includes(texto) || (almacen.getItem(clave) ?? '').includes(texto)),
      )
    }

    beforeEach(() => {
      window.localStorage.clear()
      window.sessionStorage.clear()
    })

    it('después de guardar, ni el texto ni el mensaje quedan en localStorage ni en sessionStorage', async () => {
      const guardarEnAlmacen = vi.spyOn(Storage.prototype, 'setItem')
      const onGuardado = vi.fn<(mensaje: unknown) => void>()
      render(<HojaDePapel emocion="tristeza" onGuardado={onGuardado} />)

      escribir(SECRETO)
      guardar()
      await waitFor(() => expect(onGuardado).toHaveBeenCalledOnce())

      for (const texto of [SECRETO, MENSAJE.texto]) {
        expect(almacenamientoContiene(texto)).toBe(false)
        expect(guardarEnAlmacen.mock.calls.flat().join(' ')).not.toContain(texto)
      }
      guardarEnAlmacen.mockRestore()
    })

    it('si falla al guardar, tampoco queda en el almacenamiento', async () => {
      vi.mocked(guardarDesahogo).mockRejectedValue(new Error('caída'))
      const guardarEnAlmacen = vi.spyOn(Storage.prototype, 'setItem')
      render(<HojaDePapel emocion="miedo" onGuardado={() => {}} />)

      escribir(SECRETO)
      guardar()
      await screen.findByRole('alert')

      expect(almacenamientoContiene(SECRETO)).toBe(false)
      expect(guardarEnAlmacen.mock.calls.flat().join(' ')).not.toContain(SECRETO)
      guardarEnAlmacen.mockRestore()
    })

    it('un error de la API no repite el texto en el mensaje que se muestra', async () => {
      vi.mocked(guardarDesahogo).mockRejectedValue(new Error(`falló ${SECRETO}`))
      render(<HojaDePapel emocion="rabia" onGuardado={() => {}} />)

      escribir(SECRETO)
      guardar()

      expect(await screen.findByRole('alert')).not.toHaveTextContent(SECRETO)
    })
  })
})
