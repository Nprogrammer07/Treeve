import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi, pedirApi } from './clienteApi.ts'
import { borrarSesion, guardarSesion, leerSesion } from './sesion.ts'

describe('pedirApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    borrarSesion()
  })

  it('devuelve el JSON de una respuesta exitosa', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ etapa: 'brote' }), { status: 200 })))

    await expect(pedirApi('/api/espacio-verde')).resolves.toEqual({ etapa: 'brote' })
  })

  it('lanza ErrorApi con el estado HTTP y sin el cuerpo enviado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 403 })))

    const error = await pedirApi('/api/desahogos', { method: 'POST', body: '{"texto":"privado"}' }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ErrorApi)
    expect(error).toMatchObject({ estado: 403 })
    expect((error as ErrorApi).message).not.toContain('privado')
  })

  it('envía el token de la sesión en la cabecera Authorization', async () => {
    guardarSesion({ usuarioId: 'u-1', apodo: 'Ani', token: 'token-secreto', expiraEn: '2999-01-01T00:00:00Z' })
    const falso = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', falso)

    await pedirApi('/api/auth/yo')

    const cabeceras = new Headers(falso.mock.calls[0]?.[1]?.headers)
    expect(cabeceras.get('Authorization')).toBe('Bearer token-secreto')
  })

  it('sin sesión no envía Authorization', async () => {
    const falso = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', falso)

    await pedirApi('/api/auth/login', { method: 'POST', body: '{}' })

    const cabeceras = new Headers(falso.mock.calls[0]?.[1]?.headers)
    expect(cabeceras.has('Authorization')).toBe(false)
    expect(cabeceras.get('Content-Type')).toBe('application/json')
  })

  it('expone el código y el mensaje que la API escribió para la persona', async () => {
    const cuerpo = { codigo: 'CREDENCIALES_INVALIDAS', mensaje: 'Usuario o contraseña incorrectos.' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(cuerpo), { status: 401 })))

    const error = await pedirApi('/api/auth/login', { method: 'POST', body: '{}' }).catch((e: unknown) => e)

    expect(error).toMatchObject({ estado: 401, codigo: 'CREDENCIALES_INVALIDAS', mensajeParaUsuario: 'Usuario o contraseña incorrectos.' })
    expect(leerSesion()).toBeNull()
  })

  it('lee Retry-After cuando la cuenta está bloqueada', async () => {
    const respuesta = new Response(JSON.stringify({ codigo: 'CUENTA_BLOQUEADA', mensaje: 'Intenta de nuevo en 15 minuto(s).' }), {
      status: 429,
      headers: { 'Retry-After': '900' },
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta))

    const error = await pedirApi('/api/auth/login', { method: 'POST', body: '{}' }).catch((e: unknown) => e)

    expect(error).toMatchObject({ estado: 429, codigo: 'CUENTA_BLOQUEADA', reintentarEnSeg: 900 })
  })

  it('si el token ya no vale (NO_AUTENTICADO), olvida la sesión', async () => {
    guardarSesion({ usuarioId: 'u-1', apodo: 'Ani', token: 'viejo', expiraEn: '2999-01-01T00:00:00Z' })
    const cuerpo = { codigo: 'NO_AUTENTICADO', mensaje: 'Inicia sesión para continuar.' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(cuerpo), { status: 401 })))

    await pedirApi('/api/desahogos').catch(() => undefined)

    expect(leerSesion()).toBeNull()
  })

  it('una respuesta de error que no es JSON deja solo el estado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 502 })))

    const error = await pedirApi('/api/auth/yo').catch((e: unknown) => e)

    expect(error).toMatchObject({ estado: 502, codigo: undefined, mensajeParaUsuario: undefined })
  })
})
