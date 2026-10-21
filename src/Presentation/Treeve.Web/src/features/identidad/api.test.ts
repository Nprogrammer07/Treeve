import { afterEach, describe, expect, it, vi } from 'vitest'
import { borrarSesion, leerSesion } from '../../shared/api/sesion.ts'
import { iniciarSesion, registrar } from './api.ts'

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
