import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '../../shared/api/clienteApi.ts'
import { borrarSesion, guardarSesion, leerSesion } from '../../shared/api/sesion.ts'
import { restablecerContrasena } from './api.ts'
import { RestablecerContrasena } from './RestablecerContrasena.tsx'
import { reiniciarLecturaDelToken } from './tokenDeRecuperacion.ts'

vi.mock('./api.ts', () => ({ restablecerContrasena: vi.fn<typeof restablecerContrasena>() }))

const TOKEN = 'token-secreto-777'
const CLAVE = 'NuevaClave2026'

const pantalla = (extra: Partial<Parameters<typeof RestablecerContrasena>[0]> = {}) => <RestablecerContrasena onRestablecida={() => {}} onPedirEnlace={() => {}} {...extra} />
const llenar = (contrasena: string, confirmacion = contrasena) => {
  fireEvent.change(screen.getByLabelText(/^Contraseña nueva/), { target: { value: contrasena } })
  fireEvent.change(screen.getByLabelText(/^Confirma tu contraseña/), { target: { value: confirmacion } })
}
const cambiar = () => fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

describe('RestablecerContrasena (HU-03b)', () => {
  beforeEach(() => {
    reiniciarLecturaDelToken()
    window.history.replaceState(null, '', `/restablecer-contrasena?token=${TOKEN}`)
    vi.mocked(restablecerContrasena).mockReset()
    vi.mocked(restablecerContrasena).mockResolvedValue(undefined)
  })

  afterEach(() => {
    window.history.replaceState(null, '', '/')
    borrarSesion()
    vi.restoreAllMocks()
  })

  describe('el enlace', () => {
    it('lee el token y lo borra de la barra de direcciones apenas se abre la pantalla', () => {
      render(pantalla())

      expect(window.location.search).toBe('')
      expect(window.location.href).not.toContain(TOKEN)
      expect(screen.getByRole('heading', { level: 1, name: 'Elige tu contraseña nueva' })).toBeInTheDocument()
    })

    it('el token no aparece en ninguna parte de la pantalla', () => {
      render(pantalla())

      expect(document.body.innerHTML).not.toContain(TOKEN)
    })

    it('sin token en la dirección dice que el enlace no es válido y ofrece pedir uno nuevo', () => {
      window.history.replaceState(null, '', '/restablecer-contrasena')
      reiniciarLecturaDelToken()
      const onPedirEnlace = vi.fn<() => void>()
      render(pantalla({ onPedirEnlace }))

      expect(screen.getByRole('heading', { level: 1, name: 'El enlace no es válido' })).toBeInTheDocument()
      expect(screen.queryByLabelText(/^Contraseña nueva/)).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Pedir un enlace nuevo' }))
      expect(onPedirEnlace).toHaveBeenCalledOnce()
    })
  })

  describe('la contraseña nueva', () => {
    it('exige que la contraseña cumpla la política y no envía nada si no la cumple', () => {
      render(pantalla())

      llenar('corta1')
      cambiar()

      expect(restablecerContrasena).not.toHaveBeenCalled()
      expect(screen.getByLabelText(/^Contraseña nueva/)).toHaveFocus()
      expect(screen.getByLabelText(/^Contraseña nueva/)).toHaveAccessibleDescription(/de 8 a 128 caracteres, con al menos una letra y un número/)
    })

    it('exige que la confirmación coincida y lo explica', () => {
      render(pantalla())

      llenar(CLAVE, 'OtraClave2026')
      cambiar()

      expect(restablecerContrasena).not.toHaveBeenCalled()
      expect(screen.getByLabelText(/^Confirma tu contraseña/)).toHaveAccessibleDescription('Las contraseñas no coinciden.')
    })

    it('cada campo tiene su etiqueta y los dos son de contraseña', () => {
      render(pantalla())

      expect(screen.getByLabelText(/^Contraseña nueva/)).toHaveAttribute('type', 'password')
      expect(screen.getByLabelText(/^Confirma tu contraseña/)).toHaveAttribute('type', 'password')
      expect(screen.getByLabelText(/^Contraseña nueva/)).toHaveAttribute('autocomplete', 'new-password')
    })
  })

  describe('al enviar', () => {
    it('manda el token y la contraseña a la API', async () => {
      render(pantalla())

      llenar(CLAVE)
      cambiar()

      await waitFor(() => expect(restablecerContrasena).toHaveBeenCalledWith({ token: TOKEN, contrasena: CLAVE }))
    })

    it('204: avisa que se cambió y se lleva a la persona a iniciar sesión', async () => {
      const onRestablecida = vi.fn<() => void>()
      render(pantalla({ onRestablecida }))

      llenar(CLAVE)
      cambiar()

      await waitFor(() => expect(onRestablecida).toHaveBeenCalledOnce())
    })

    it('204: se cierran todas las sesiones, también la actual, así que se olvida la sesión guardada en el navegador', async () => {
      guardarSesion({ usuarioId: 'u-1', apodo: 'Ani', token: 'sesion-anterior', expiraEn: '2999-01-01T00:00:00Z' })
      const onRestablecida = vi.fn<() => void>()
      render(pantalla({ onRestablecida }))

      llenar(CLAVE)
      cambiar()

      await waitFor(() => expect(onRestablecida).toHaveBeenCalled())
      expect(leerSesion()).toBeNull()
      expect(window.sessionStorage.getItem('treeve.sesion')).toBeNull()
    })

    it('400 VALIDACION: muestra el mensaje de la API y el enlace no se gasta: se puede reintentar con el mismo token', async () => {
      vi.mocked(restablecerContrasena).mockRejectedValueOnce(new ErrorApi(400, { codigo: 'VALIDACION', mensajeParaUsuario: 'La contraseña no cumple la política.' }))
      const onRestablecida = vi.fn<() => void>()
      render(pantalla({ onRestablecida }))

      llenar(CLAVE)
      cambiar()
      expect(await screen.findByRole('alert')).toHaveTextContent('La contraseña no cumple la política.')
      expect(screen.getByLabelText(/^Contraseña nueva/)).toHaveValue(CLAVE)
      cambiar()

      await waitFor(() => expect(onRestablecida).toHaveBeenCalledOnce())
      expect(vi.mocked(restablecerContrasena).mock.calls.map(([datos]) => datos.token)).toEqual([TOKEN, TOKEN])
    })

    it('400 TOKEN_INVALIDO: muestra el mensaje de la API y ofrece pedir un enlace nuevo, sin dejar reintentar con ese token', async () => {
      vi.mocked(restablecerContrasena).mockRejectedValue(new ErrorApi(400, { codigo: 'TOKEN_INVALIDO', mensajeParaUsuario: 'El enlace no es válido o ya venció. Solicita uno nuevo.' }))
      const onPedirEnlace = vi.fn<() => void>()
      render(pantalla({ onPedirEnlace }))

      llenar(CLAVE)
      cambiar()

      expect(await screen.findByRole('heading', { level: 1, name: 'El enlace no es válido' })).toBeInTheDocument()
      expect(screen.getByText('El enlace no es válido o ya venció. Solicita uno nuevo.')).toBeInTheDocument()
      expect(screen.queryByLabelText(/^Contraseña nueva/)).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Pedir un enlace nuevo' }))
      expect(onPedirEnlace).toHaveBeenCalledOnce()
    })

    it('si falla sin más datos, avisa con amabilidad y conserva lo escrito', async () => {
      vi.mocked(restablecerContrasena).mockRejectedValue(new TypeError('sin conexión'))
      render(pantalla())

      llenar(CLAVE)
      cambiar()

      expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cambiar tu contraseña')
      expect(screen.getByLabelText(/^Contraseña nueva/)).toHaveValue(CLAVE)
    })
  })

  describe('seguridad: el token y la contraseña no se registran', () => {
    it('no escriben en la consola, ni en el caso feliz ni en los fallos', async () => {
      const consola = (['log', 'info', 'warn', 'error', 'debug'] as const).map((metodo) => vi.spyOn(console, metodo).mockImplementation(() => {}))
      vi.mocked(restablecerContrasena).mockRejectedValueOnce(new ErrorApi(400, { codigo: 'VALIDACION', mensajeParaUsuario: 'No cumple.' }))
      render(pantalla())

      llenar(CLAVE)
      cambiar()
      await screen.findByRole('alert')
      cambiar()
      await waitFor(() => expect(restablecerContrasena).toHaveBeenCalledTimes(2))

      const escrito = consola.flatMap((espia) => espia.mock.calls).flat().map(String).join(' ')
      expect(escrito).not.toContain(TOKEN)
      expect(escrito).not.toContain(CLAVE)
    })

    it('no se guardan en ningún almacenamiento del navegador', async () => {
      window.localStorage.clear()
      window.sessionStorage.clear()
      render(pantalla())

      llenar(CLAVE)
      cambiar()
      await waitFor(() => expect(restablecerContrasena).toHaveBeenCalled())

      const guardado = JSON.stringify({ ...window.localStorage, ...window.sessionStorage })
      expect(guardado).not.toContain(TOKEN)
      expect(guardado).not.toContain(CLAVE)
    })
  })
})
