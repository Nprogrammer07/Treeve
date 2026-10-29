import { afterEach, describe, expect, it, vi } from 'vitest'
import { borrarSesion, leerSesion } from '../../shared/api/sesion.ts'
import { iniciarSesion, registrar, restablecerContrasena, solicitarRecuperacion } from './api.ts'

const respuestaDeSesion = { usuarioId: 'u-1', apodo: 'Ani', token: 'token-secreto', expiraEn: '2999-01-01T00:00:00Z' }

function responder(estado: number, cuerpo: unknown) {
  const falso = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(cuerpo), { status: estado }))
  vi.stubGlobal('fetch', falso)
  return falso
}

afterEach(() => {
  vi.unstubAllGlobals()
  borrarSesion()
})

describe('api de identidad', () => {
  it('registrar llama a /api/auth/registro y deja la sesión abierta', async () => {
    const falso = responder(201, respuestaDeSesion)
    const datos = { nombreCompleto: 'Ana López', apodo: 'Ani', nombreDeUsuario: 'ana.l', contrasena: 'Treeve2026' }

    await registrar(datos)

    const [ruta, opciones] = falso.mock.calls[0] ?? []
    expect(ruta).toBe('/api/auth/registro')
    expect(opciones?.method).toBe('POST')
    expect(JSON.parse(String(opciones?.body))).toEqual(datos)
    expect(leerSesion()).toEqual(respuestaDeSesion)
  })

  it('iniciarSesion llama a /api/auth/login y deja la sesión abierta', async () => {
    const falso = responder(200, respuestaDeSesion)

    await iniciarSesion({ identificador: 'ana.l', contrasena: 'Treeve2026' })

    expect(falso.mock.calls[0]?.[0]).toBe('/api/auth/login')
    expect(leerSesion()?.apodo).toBe('Ani')
  })

  it('si la API rechaza las credenciales, no se abre sesión', async () => {
    responder(401, { codigo: 'CREDENCIALES_INVALIDAS', mensaje: 'Usuario o contraseña incorrectos.' })

    await expect(iniciarSesion({ identificador: 'ana.l', contrasena: 'mala' })).rejects.toMatchObject({ estado: 401 })

    expect(leerSesion()).toBeNull()
  })
})

describe('api de recuperación de contraseña (HU-03b)', () => {
  it('solicitarRecuperacion hace POST /api/auth/recuperacion solo con el correo y entrega el mensaje de la API', async () => {
    const mensaje = 'Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña. Revisa también la carpeta de spam.'
    const falso = responder(202, { mensaje })

    const respuesta = await solicitarRecuperacion({ correo: 'ana@correo.com' })

    const [ruta, opciones] = falso.mock.calls[0] ?? []
    expect(ruta).toBe('/api/auth/recuperacion')
    expect(opciones?.method).toBe('POST')
    expect(JSON.parse(String(opciones?.body))).toEqual({ correo: 'ana@correo.com' })
    expect(respuesta).toEqual({ mensaje })
  })

  it('si el correo no parece un correo (400), el error conserva el mensaje de la API', async () => {
    responder(400, { codigo: 'VALIDACION', mensaje: 'Escribe un correo válido.' })

    await expect(solicitarRecuperacion({ correo: 'no-es-correo' })).rejects.toMatchObject({ estado: 400, mensajeParaUsuario: 'Escribe un correo válido.' })
  })

  it('restablecerContrasena hace POST /api/auth/recuperacion/restablecer con el token y la contraseña, y no devuelve nada en el 204', async () => {
    const falso = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', falso)

    await expect(restablecerContrasena({ token: 'abc123', contrasena: 'NuevaClave2026' })).resolves.toBeUndefined()

    const [ruta, opciones] = falso.mock.calls[0] ?? []
    expect(ruta).toBe('/api/auth/recuperacion/restablecer')
    expect(opciones?.method).toBe('POST')
    expect(JSON.parse(String(opciones?.body))).toEqual({ token: 'abc123', contrasena: 'NuevaClave2026' })
  })

  it('un enlace vencido o ya usado llega como TOKEN_INVALIDO', async () => {
    responder(400, { codigo: 'TOKEN_INVALIDO', mensaje: 'El enlace no es válido o ya venció. Solicita uno nuevo.' })

    await expect(restablecerContrasena({ token: 'viejo', contrasena: 'NuevaClave2026' })).rejects.toMatchObject({ estado: 400, codigo: 'TOKEN_INVALIDO' })
  })

  it('una contraseña que no cumple la política llega como VALIDACION', async () => {
    responder(400, { codigo: 'VALIDACION', mensaje: 'La contraseña debe tener al menos una letra y un número.' })

    await expect(restablecerContrasena({ token: 'abc123', contrasena: 'solo-letras' })).rejects.toMatchObject({ codigo: 'VALIDACION' })
  })

  it('el error nunca repite el token ni la contraseña', async () => {
    responder(400, { codigo: 'TOKEN_INVALIDO', mensaje: 'El enlace no es válido o ya venció. Solicita uno nuevo.' })

    const error = await restablecerContrasena({ token: 'token-secreto-777', contrasena: 'ClaveSecreta2026' }).catch((e: unknown) => e)

    expect(JSON.stringify(error)).not.toContain('token-secreto-777')
    expect(String((error as Error).message)).not.toContain('ClaveSecreta2026')
  })
})
