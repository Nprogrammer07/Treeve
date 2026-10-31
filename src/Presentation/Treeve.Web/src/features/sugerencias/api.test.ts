import { afterEach, describe, expect, it, vi } from 'vitest'
import { borrarSesion, guardarSesion } from '../../shared/api/sesion.ts'
import { enviarSugerencia, listarMisSugerencias } from './api.ts'

function responder(estado: number, cuerpo: unknown) {
  const falso = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(cuerpo), { status: estado }))
  vi.stubGlobal('fetch', falso)
  return falso
}

afterEach(() => {
  vi.unstubAllGlobals()
  borrarSesion()
})

describe('api de sugerencias', () => {
  it('enviarSugerencia hace POST /api/sugerencias solo con el texto y manda el token', async () => {
    guardarSesion({ usuarioId: 'u-1', apodo: 'Ani', token: 'token-secreto', expiraEn: '2999-01-01T00:00:00Z' })
    const falso = responder(201, { sugerenciaId: 's-1', creadaEn: '2026-10-26T15:00:00-05:00', estado: 'pendiente' })

    const enviada = await enviarSugerencia({ texto: 'Me gustaría un modo oscuro' })

    const [ruta, opciones] = falso.mock.calls[0] ?? []
    expect(ruta).toBe('/api/sugerencias')
    expect(opciones?.method).toBe('POST')
    expect(JSON.parse(String(opciones?.body))).toEqual({ texto: 'Me gustaría un modo oscuro' })
    expect(new Headers(opciones?.headers).get('Authorization')).toBe('Bearer token-secreto')
    expect(enviada).toEqual({ sugerenciaId: 's-1', creadaEn: '2026-10-26T15:00:00-05:00', estado: 'pendiente' })
  })

  it('si la API rechaza el texto (400), el error conserva el mensaje para mostrarlo', async () => {
    responder(400, { codigo: 'VALIDACION', mensaje: 'La sugerencia no puede estar vacía.' })

    await expect(enviarSugerencia({ texto: '   ' })).rejects.toMatchObject({ estado: 400, mensajeParaUsuario: 'La sugerencia no puede estar vacía.' })
  })

  it('listarMisSugerencias hace GET /api/sugerencias y entrega la lista', async () => {
    const falso = responder(200, { sugerencias: [{ sugerenciaId: 's-1', texto: 'Modo oscuro', estado: 'en_revision', creadaEn: '2026-10-26T15:00:00-05:00', comentario: 'Lo estamos evaluando.', respondidaEn: '2026-10-30T10:00:00-05:00' }] })

    const lista = await listarMisSugerencias()

    expect(falso.mock.calls[0]?.[0]).toBe('/api/sugerencias')
    expect(falso.mock.calls[0]?.[1]?.method).toBeUndefined()
    expect(lista).toHaveLength(1)
    expect(lista[0]?.estado).toBe('en_revision')
    expect(lista[0]).toMatchObject({ comentario: 'Lo estamos evaluando.', respondidaEn: '2026-10-30T10:00:00-05:00' })
  })

  it('sin sugerencias devuelve una lista vacía', async () => {
    responder(200, { sugerencias: [] })

    expect(await listarMisSugerencias()).toEqual([])
  })
})
