import { afterEach, describe, expect, it, vi } from 'vitest'
import { borrarSesion, guardarSesion } from '../../shared/api/sesion.ts'
import { consultarAcceso, crearFuenteDeStaff, diaSiguiente, parametrosDeConsulta } from './api.ts'

function responder(estado: number, cuerpo: unknown) {
  const falso = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(cuerpo), { status: estado }))
  vi.stubGlobal('fetch', falso)
  return falso
}

afterEach(() => {
  vi.unstubAllGlobals()
  borrarSesion()
})

describe('consultarAcceso (HU-10)', () => {
  it('pregunta a /api/staff/acceso con el token y entrega el rol', async () => {
    guardarSesion({ usuarioId: 'u-1', apodo: 'Ani', token: 'token-secreto', expiraEn: '2999-01-01T00:00:00Z' })
    const falso = responder(200, { rol: 'administrador' })

    expect(await consultarAcceso()).toBe('administrador')

    expect(falso.mock.calls[0]?.[0]).toBe('/api/staff/acceso')
    expect(new Headers(falso.mock.calls[0]?.[1]?.headers).get('Authorization')).toBe('Bearer token-secreto')
  })

  it.each(['staff', 'administrador'])('acepta el rol "%s"', async (rol) => {
    responder(200, { rol })

    expect(await consultarAcceso()).toBe(rol)
  })

  it('si la persona no es staff, el error conserva el 403 para que la pantalla diga "acceso denegado"', async () => {
    responder(403, { codigo: 'ACCESO_DENEGADO', mensaje: 'No tienes permiso para esta acción.' })

    await expect(consultarAcceso()).rejects.toMatchObject({ estado: 403, codigo: 'ACCESO_DENEGADO' })
  })

  it('no acepta un rol que no conoce: el frontend no inventa permisos', async () => {
    responder(200, { rol: 'superusuario' })

    await expect(consultarAcceso()).rejects.toThrow('rol desconocido')
  })
})

describe('diaSiguiente', () => {
  it('suma un día, también al cambiar de mes y de año', () => {
    expect(diaSiguiente('2026-10-05')).toBe('2026-10-06')
    expect(diaSiguiente('2026-10-31')).toBe('2026-11-01')
    expect(diaSiguiente('2026-12-31')).toBe('2027-01-01')
  })
})

describe('parametrosDeConsulta', () => {
  it('sin filtros solo lleva la paginación', () => {
    expect(parametrosDeConsulta({ limite: 10, desplazamiento: 0 })).toBe('limite=10&desplazamiento=0')
  })

  it('arma estado, usuario (sin espacios sobrantes), fechas y paginación', () => {
    const texto = parametrosDeConsulta({ estado: 'en_revision', usuario: '  ana.l  ', desde: '2026-10-01', hasta: '2026-10-15', limite: 10, desplazamiento: 20 })
    const parametros = new URLSearchParams(texto)

    expect(parametros.get('estado')).toBe('en_revision')
    expect(parametros.get('usuario')).toBe('ana.l')
    expect(parametros.get('desde')).toBe('2026-10-01')
    expect(parametros.get('limite')).toBe('10')
    expect(parametros.get('desplazamiento')).toBe('20')
  })

  it('envía el orden que pidió la persona y nada si no pidió ninguno', () => {
    expect(new URLSearchParams(parametrosDeConsulta({ orden: 'antiguas', limite: 10, desplazamiento: 0 })).get('orden')).toBe('antiguas')
    expect(new URLSearchParams(parametrosDeConsulta({ orden: 'usuario', limite: 10, desplazamiento: 0 })).get('orden')).toBe('usuario')
    expect(new URLSearchParams(parametrosDeConsulta({ limite: 10, desplazamiento: 0 })).has('orden')).toBe(false)
  })

  it('"hasta" incluye ese día: se envía el siguiente porque la API no incluye el límite', () => {
    expect(new URLSearchParams(parametrosDeConsulta({ hasta: '2026-10-15', limite: 10, desplazamiento: 0 })).get('hasta')).toBe('2026-10-16')
  })

  it('un solo día (desde = hasta) queda con "hasta" posterior a "desde", como exige la API', () => {
    const parametros = new URLSearchParams(parametrosDeConsulta({ desde: '2026-10-05', hasta: '2026-10-05', limite: 10, desplazamiento: 0 }))

    expect(parametros.get('desde')).toBe('2026-10-05')
    expect(parametros.get('hasta')).toBe('2026-10-06')
  })

  it('un usuario de solo espacios no es un filtro', () => {
    expect(new URLSearchParams(parametrosDeConsulta({ usuario: '   ', limite: 10, desplazamiento: 0 })).has('usuario')).toBe(false)
  })
})

describe('crearFuenteDeStaff', () => {
  const respuesta = {
    sugerencias: [{ sugerenciaId: 's-1', usuarioId: 'u-9', nombreDeUsuario: 'ana.l', texto: 'Un modo oscuro', estado: 'en_revision', creadaEn: '2026-10-26T15:00:00-05:00' }],
    hayMas: true,
  }

  it('consulta /api/staff/sugerencias y traduce la respuesta al modelo de la pantalla', async () => {
    const falso = responder(200, respuesta)

    const pagina = await crearFuenteDeStaff().consultar({ estado: 'en_revision', limite: 10, desplazamiento: 0 })

    expect(String(falso.mock.calls[0]?.[0])).toMatch(/^\/api\/staff\/sugerencias\?/)
    expect(pagina).toEqual({
      items: [{ id: 's-1', usuario: 'ana.l', fecha: '2026-10-26T15:00:00-05:00', texto: 'Un modo oscuro', estado: 'en_revision' }],
      hayMas: true,
    })
  })

  it('no entrega el id de la persona (usuarioId) a la pantalla', async () => {
    responder(200, respuesta)

    const pagina = await crearFuenteDeStaff().consultar({ limite: 10, desplazamiento: 0 })

    expect(JSON.stringify(pagina)).not.toContain('u-9')
  })

  it('si la API trae un estado que no conoce, falla en vez de mostrar algo equivocado', async () => {
    responder(200, { sugerencias: [{ ...respuesta.sugerencias[0], estado: 'archivada' }], hayMas: false })

    await expect(crearFuenteDeStaff().consultar({ limite: 10, desplazamiento: 0 })).rejects.toThrow('estado desconocido')
  })

  it('un 403 llega a la pantalla con su estado', async () => {
    responder(403, { codigo: 'ACCESO_DENEGADO', mensaje: 'No tienes permiso para esta acción.' })

    await expect(crearFuenteDeStaff().consultar({ limite: 10, desplazamiento: 0 })).rejects.toMatchObject({ estado: 403 })
  })

  it('ofrece gestionar (HU-11), pero no cifras de resumen: la API no las tiene', () => {
    const fuente = crearFuenteDeStaff()

    expect(fuente.actualizar).toBeTypeOf('function')
    expect(fuente.resumen).toBeUndefined()
  })

  it('trae el comentario del staff y la fecha de la última gestión, y omite los que vienen vacíos', async () => {
    responder(200, {
      sugerencias: [
        { ...respuesta.sugerencias[0], sugerenciaId: 's-1', comentario: 'Lo vamos a evaluar.', gestionadaEn: '2026-10-30T10:00:00-05:00' },
        { ...respuesta.sugerencias[0], sugerenciaId: 's-2', comentario: null, gestionadaEn: null },
      ],
      hayMas: false,
    })

    const { items } = await crearFuenteDeStaff().consultar({ limite: 10, desplazamiento: 0 })

    expect(items[0]).toMatchObject({ comentario: 'Lo vamos a evaluar.', gestionadaEn: '2026-10-30T10:00:00-05:00' })
    expect(items[1]).not.toHaveProperty('comentario')
    expect(items[1]).not.toHaveProperty('gestionadaEn')
  })
})

describe('gestionar una sugerencia (HU-11)', () => {
  const gestionada = { sugerenciaId: 's-1', estado: 'implementada', comentario: 'Ya está.', gestionadaEn: '2026-10-30T10:00:00-05:00', huboCambios: true }

  it('hace PATCH /api/staff/sugerencias/{id} con el token y solo lo que cambió', async () => {
    guardarSesion({ usuarioId: 'u-1', apodo: 'Ani', token: 'token-secreto', expiraEn: '2999-01-01T00:00:00Z' })
    const falso = responder(200, gestionada)

    const resultado = await crearFuenteDeStaff().actualizar?.('s-1', { estado: 'implementada' })

    const [ruta, opciones] = falso.mock.calls[0] ?? []
    expect(ruta).toBe('/api/staff/sugerencias/s-1')
    expect(opciones?.method).toBe('PATCH')
    expect(JSON.parse(String(opciones?.body))).toEqual({ estado: 'implementada' })
    expect(new Headers(opciones?.headers).get('Authorization')).toBe('Bearer token-secreto')
    expect(resultado).toEqual({ huboCambios: true })
  })

  it('envía estado y comentario juntos si cambiaron los dos', async () => {
    const falso = responder(200, gestionada)

    await crearFuenteDeStaff().actualizar?.('s-1', { estado: 'implementada', comentario: 'Ya está.' })

    expect(JSON.parse(String(falso.mock.calls[0]?.[1]?.body))).toEqual({ estado: 'implementada', comentario: 'Ya está.' })
  })

  it('un comentario vacío viaja como "": así es como la API quita el comentario', async () => {
    const falso = responder(200, { ...gestionada, comentario: null })

    await crearFuenteDeStaff().actualizar?.('s-1', { comentario: '' })

    expect(JSON.parse(String(falso.mock.calls[0]?.[1]?.body))).toEqual({ comentario: '' })
  })

  it('si el servidor dice que no hubo cambios, lo entrega tal cual', async () => {
    responder(200, { ...gestionada, huboCambios: false })

    expect(await crearFuenteDeStaff().actualizar?.('s-1', { estado: 'implementada' })).toEqual({ huboCambios: false })
  })

  it('el id va codificado en la ruta: no puede alterar el camino de la petición', async () => {
    const falso = responder(200, gestionada)

    await crearFuenteDeStaff().actualizar?.('a/b?x=1', { estado: 'rechazada' })

    expect(falso.mock.calls[0]?.[0]).toBe('/api/staff/sugerencias/a%2Fb%3Fx%3D1')
  })

  it('400 VALIDACION (comentario demasiado largo o sugerencia inexistente) conserva el mensaje para mostrarlo', async () => {
    responder(400, { codigo: 'VALIDACION', mensaje: 'El comentario no puede superar 500 caracteres.' })

    await expect(crearFuenteDeStaff().actualizar?.('s-1', { comentario: 'x' })).rejects.toMatchObject({ estado: 400, mensajeParaUsuario: 'El comentario no puede superar 500 caracteres.' })
  })

  it('403 si la persona no es staff', async () => {
    responder(403, { codigo: 'ACCESO_DENEGADO', mensaje: 'No tienes permiso para esta acción.' })

    await expect(crearFuenteDeStaff().actualizar?.('s-1', { estado: 'rechazada' })).rejects.toMatchObject({ estado: 403 })
  })
})
