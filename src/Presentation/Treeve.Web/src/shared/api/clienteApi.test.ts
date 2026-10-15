import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi, pedirApi } from './clienteApi.ts'

describe('pedirApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
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
})
