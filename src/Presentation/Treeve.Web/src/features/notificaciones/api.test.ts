import { afterEach, describe, expect, it, vi } from 'vitest'
import { borrarSesion, guardarSesion } from '../../shared/api/sesion.ts'
import { listarNotificaciones, marcarComoLeida } from './api.ts'

const respuesta = {
  notificaciones: [
    { notificacionId: 'n-3', tipo: 'sugerencia_respondida', mensaje: 'El equipo respondió una de tus sugerencias.', creadaEn: '2026-10-31T10:00:00-05:00', leida: false },
    { notificacionId: 'n-2', tipo: 'ascendido_a_staff', mensaje: 'Ahora formas parte del staff de Treeve.', creadaEn: '2026-10-30T10:00:00-05:00', leida: true },
    { notificacionId: 'n-1', tipo: 'staff_revocado', mensaje: 'Ya no formas parte del staff de Treeve.', creadaEn: '2026-10-29T10:00:00-05:00', leida: true },
  ],
}

function responder(estado: number, cuerpo: unknown) {
  const falso = vi.fn<typeof fetch>().mockResolvedValue(new Response(cuerpo === null ? null : JSON.stringify(cuerpo), { status: estado }))
  vi.stubGlobal('fetch', falso)
  return falso
}

afterEach(() => {
  vi.unstubAllGlobals()
  borrarSesion()
})

describe('listarNotificaciones', () => {
  it('pide GET /api/notificaciones con el token', async () => {
    guardarSesion({ usuarioId: 'u-1', apodo: 'Ani', token: 'token-secreto', expiraEn: '2999-01-01T00:00:00Z' })
    const falso = responder(200, respuesta)

    await listarNotificaciones()

    const [ruta, opciones] = falso.mock.calls[0] ?? []
    expect(ruta).toBe('/api/notificaciones')
    expect(opciones?.method).toBeUndefined()
    expect(new Headers(opciones?.headers).get('Authorization')).toBe('Bearer token-secreto')
  })

  it('traduce los avisos al modelo de la pantalla, en el mismo orden y con el mensaje tal cual', async () => {
    responder(200, respuesta)

    expect(await listarNotificaciones()).toEqual([
      { id: 'n-3', tipo: 'sugerencia_respondida', mensaje: 'El equipo respondió una de tus sugerencias.', creadaEn: '2026-10-31T10:00:00-05:00', leida: false },
      { id: 'n-2', tipo: 'ascendido_a_staff', mensaje: 'Ahora formas parte del staff de Treeve.', creadaEn: '2026-10-30T10:00:00-05:00', leida: true },
      { id: 'n-1', tipo: 'staff_revocado', mensaje: 'Ya no formas parte del staff de Treeve.', creadaEn: '2026-10-29T10:00:00-05:00', leida: true },
    ])
  })

  it('un tipo de aviso que esta versión no conoce no rompe nada: se muestra su mensaje como "otro"', async () => {
    responder(200, { notificaciones: [{ ...respuesta.notificaciones[0], tipo: 'cumpleanos_del_arbol', mensaje: 'Tu árbol cumple un año.' }] })

    expect(await listarNotificaciones()).toEqual([expect.objectContaining({ tipo: 'otro', mensaje: 'Tu árbol cumple un año.' })])
  })

  it('sin avisos devuelve una lista vacía', async () => {
    responder(200, { notificaciones: [] })

    expect(await listarNotificaciones()).toEqual([])
  })

  it('sin sesión (401), el error llega con su estado y la sesión se olvida', async () => {
    guardarSesion({ usuarioId: 'u-1', apodo: 'Ani', token: 'viejo', expiraEn: '2999-01-01T00:00:00Z' })
    responder(401, { codigo: 'NO_AUTENTICADO', mensaje: 'Inicia sesión para continuar.' })

    await expect(listarNotificaciones()).rejects.toMatchObject({ estado: 401 })
    expect(window.sessionStorage.getItem('treeve.sesion')).toBeNull()
  })
})

describe('marcarComoLeida', () => {
  it('hace POST /api/notificaciones/{id}/leida con el token y no devuelve nada en el 204', async () => {
    guardarSesion({ usuarioId: 'u-1', apodo: 'Ani', token: 'token-secreto', expiraEn: '2999-01-01T00:00:00Z' })
    const falso = responder(204, null)

    await expect(marcarComoLeida('n-3')).resolves.toBeUndefined()

    const [ruta, opciones] = falso.mock.calls[0] ?? []
    expect(ruta).toBe('/api/notificaciones/n-3/leida')
    expect(opciones?.method).toBe('POST')
    expect(new Headers(opciones?.headers).get('Authorization')).toBe('Bearer token-secreto')
  })

  it('el id va codificado en la ruta: no puede alterar el camino de la petición', async () => {
    const falso = responder(204, null)

    await marcarComoLeida('a/b?x=1')

    expect(falso.mock.calls[0]?.[0]).toBe('/api/notificaciones/a%2Fb%3Fx%3D1/leida')
  })

  it('403 si el aviso es de otra persona o no existe: la misma respuesta, el error conserva el estado', async () => {
    responder(403, { codigo: 'ACCESO_DENEGADO', mensaje: 'No tienes permiso para esta acción.' })

    await expect(marcarComoLeida('n-ajena')).rejects.toMatchObject({ estado: 403 })
  })
})
