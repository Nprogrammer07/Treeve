import { afterEach, describe, expect, it, vi } from 'vitest'
import { borrarSesion, guardarSesion } from '../../shared/api/sesion.ts'
import { consultarEspacioVerde } from './api.ts'

const respuesta = {
  etapaDelArbol: 'tallo',
  componentes: [
    { componente: 'arbol', nivel: 2 },
    { componente: 'flores', nivel: 2 },
    { componente: 'bosque', nivel: 1 },
  ],
  nivelMaximo: 4,
  riegos: 7,
  nutricion: 1,
  riegosParaElSiguiente: 2,
  siguienteEnCrecer: 'bosque',
  completo: false,
}

function responder(estado: number, cuerpo: unknown) {
  const falso = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(cuerpo), { status: estado }))
  vi.stubGlobal('fetch', falso)
  return falso
}

afterEach(() => {
  vi.unstubAllGlobals()
  borrarSesion()
})

describe('consultarEspacioVerde (HU-07a)', () => {
  it('pide GET /api/espacio-verde con el token', async () => {
    guardarSesion({ usuarioId: 'u-1', apodo: 'Ani', token: 'token-secreto', expiraEn: '2999-01-01T00:00:00Z' })
    const falso = responder(200, respuesta)

    await consultarEspacioVerde()

    const [ruta, opciones] = falso.mock.calls[0] ?? []
    expect(ruta).toBe('/api/espacio-verde')
    expect(opciones?.method).toBeUndefined()
    expect(new Headers(opciones?.headers).get('Authorization')).toBe('Bearer token-secreto')
  })

  it('traduce la respuesta al lote de la pantalla, tal cual la calculó el backend', async () => {
    responder(200, respuesta)

    expect(await consultarEspacioVerde()).toEqual({
      etapa: 'tallo',
      niveles: { arbol: 2, flores: 2, bosque: 1 },
      nivelMaximo: 4,
      riegos: 7,
      nutricion: 1,
      riegosParaElSiguiente: 2,
      siguienteEnCrecer: 'bosque',
      completo: false,
    })
  })

  it('no depende del orden en que llegan los componentes', async () => {
    responder(200, { ...respuesta, componentes: [...respuesta.componentes].reverse() })

    expect((await consultarEspacioVerde()).niveles).toEqual({ arbol: 2, flores: 2, bosque: 1 })
  })

  it.each(['brote', 'tallo', 'flor', 'arbol-adulto'])('acepta la etapa "%s"', async (etapa) => {
    responder(200, { ...respuesta, etapaDelArbol: etapa })

    expect((await consultarEspacioVerde()).etapa).toBe(etapa)
  })

  it('un lote completo trae siguienteEnCrecer en null', async () => {
    responder(200, { ...respuesta, siguienteEnCrecer: null, completo: true, nutricion: 0, riegosParaElSiguiente: 0 })

    expect(await consultarEspacioVerde()).toMatchObject({ siguienteEnCrecer: null, completo: true })
  })

  it('si la API trae una etapa que no conoce, falla en vez de dibujar algo equivocado', async () => {
    responder(200, { ...respuesta, etapaDelArbol: 'semilla' })

    await expect(consultarEspacioVerde()).rejects.toThrow('etapa del árbol desconocida')
  })

  it('si trae un componente que no conoce, falla', async () => {
    responder(200, { ...respuesta, componentes: [...respuesta.componentes, { componente: 'lago', nivel: 1 }] })

    await expect(consultarEspacioVerde()).rejects.toThrow('componente desconocido')
  })

  it('si falta alguno de los tres componentes, falla', async () => {
    responder(200, { ...respuesta, componentes: respuesta.componentes.slice(0, 2) })

    await expect(consultarEspacioVerde()).rejects.toThrow('tres componentes')
  })

  it('si el siguiente en crecer es desconocido, falla', async () => {
    responder(200, { ...respuesta, siguienteEnCrecer: 'lago' })

    await expect(consultarEspacioVerde()).rejects.toThrow('componente desconocido')
  })

  it('sin sesión (401), el error llega con su estado y la sesión se olvida', async () => {
    guardarSesion({ usuarioId: 'u-1', apodo: 'Ani', token: 'viejo', expiraEn: '2999-01-01T00:00:00Z' })
    responder(401, { codigo: 'NO_AUTENTICADO', mensaje: 'Inicia sesión para continuar.' })

    await expect(consultarEspacioVerde()).rejects.toMatchObject({ estado: 401 })
    expect(window.sessionStorage.getItem('treeve.sesion')).toBeNull()
  })
})
