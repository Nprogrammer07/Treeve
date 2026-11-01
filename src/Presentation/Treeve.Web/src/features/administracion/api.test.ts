import { afterEach, describe, expect, it, vi } from 'vitest'
import { borrarSesion, guardarSesion } from '../../shared/api/sesion.ts'
import { ascender, listarAccesosDenegados, listarCambiosDeRol, listarEquipo, revocar } from './api.ts'

function responder(estado: number, cuerpo: unknown) {
  const falso = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(cuerpo), { status: estado }))
  vi.stubGlobal('fetch', falso)
  return falso
}

const cambio = { usuarioId: 'u-9', nombreDeUsuario: 'ana.l', apodo: 'Ani', rolAnterior: 'usuario', rolNuevo: 'staff', ocurrioEn: '2026-11-01T10:00:00-05:00' }

afterEach(() => {
  vi.unstubAllGlobals()
  borrarSesion()
})

describe('listarEquipo', () => {
  it('pide GET /api/admin/staff con el token y traduce la lista', async () => {
    guardarSesion({ usuarioId: 'u-1', apodo: 'Nico', token: 'token-secreto', expiraEn: '2999-01-01T00:00:00Z' })
    const falso = responder(200, {
      staff: [
        { usuarioId: 'u-2', nombreDeUsuario: 'admin.n', apodo: 'Nico', rol: 'administrador' },
        { usuarioId: 'u-3', nombreDeUsuario: 'ana.l', apodo: 'Ani', rol: 'staff' },
      ],
    })

    const equipo = await listarEquipo()

    const [ruta, opciones] = falso.mock.calls[0] ?? []
    expect(ruta).toBe('/api/admin/staff')
    expect(opciones?.method).toBeUndefined()
    expect(new Headers(opciones?.headers).get('Authorization')).toBe('Bearer token-secreto')
    expect(equipo).toEqual([
      { id: 'u-2', usuario: 'admin.n', apodo: 'Nico', rol: 'administrador' },
      { id: 'u-3', usuario: 'ana.l', apodo: 'Ani', rol: 'staff' },
    ])
  })

  it('no entrega nada más que usuario, apodo y rol: ni nombre completo ni correo', async () => {
    responder(200, { staff: [{ usuarioId: 'u-3', nombreDeUsuario: 'ana.l', apodo: 'Ani', rol: 'staff', correo: 'ana@correo.com', nombreCompleto: 'Ana López' }] })

    expect(JSON.stringify(await listarEquipo())).not.toMatch(/correo|López/)
  })

  it('un rol desconocido falla en vez de mostrar un permiso equivocado', async () => {
    responder(200, { staff: [{ usuarioId: 'u-3', nombreDeUsuario: 'ana.l', apodo: 'Ani', rol: 'superusuario' }] })

    await expect(listarEquipo()).rejects.toThrow('rol desconocido')
  })

  it('en la lista del equipo, un "usuario" tampoco es válido', async () => {
    responder(200, { staff: [{ usuarioId: 'u-3', nombreDeUsuario: 'ana.l', apodo: 'Ani', rol: 'usuario' }] })

    await expect(listarEquipo()).rejects.toThrow('rol desconocido')
  })

  it('403 si la persona no es administradora: el error conserva el estado', async () => {
    responder(403, { codigo: 'ACCESO_DENEGADO', mensaje: 'No tienes permiso para esta acción.' })

    await expect(listarEquipo()).rejects.toMatchObject({ estado: 403, codigo: 'ACCESO_DENEGADO' })
  })
})

describe('ascender', () => {
  it('hace POST /api/admin/staff solo con el nombre de usuario y traduce el resultado', async () => {
    const falso = responder(200, cambio)

    const resultado = await ascender('ana.l')

    const [ruta, opciones] = falso.mock.calls[0] ?? []
    expect(ruta).toBe('/api/admin/staff')
    expect(opciones?.method).toBe('POST')
    expect(JSON.parse(String(opciones?.body))).toEqual({ nombreDeUsuario: 'ana.l' })
    expect(resultado).toEqual({ usuario: 'ana.l', apodo: 'Ani', rolAnterior: 'usuario', rolNuevo: 'staff' })
  })

  it('400 conserva el mensaje de la API para mostrarlo tal cual', async () => {
    responder(400, { codigo: 'VALIDACION', mensaje: 'No hay ninguna persona con ese nombre de usuario.' })

    await expect(ascender('nadie')).rejects.toMatchObject({ estado: 400, mensajeParaUsuario: 'No hay ninguna persona con ese nombre de usuario.' })
  })
})

describe('revocar', () => {
  it('hace DELETE /api/admin/staff/{usuarioId} con el id codificado y traduce el resultado', async () => {
    const falso = responder(200, { ...cambio, rolAnterior: 'staff', rolNuevo: 'usuario' })

    const resultado = await revocar('a/b?x=1')

    const [ruta, opciones] = falso.mock.calls[0] ?? []
    expect(ruta).toBe('/api/admin/staff/a%2Fb%3Fx%3D1')
    expect(opciones?.method).toBe('DELETE')
    expect(opciones?.body).toBeUndefined()
    expect(resultado).toMatchObject({ rolAnterior: 'staff', rolNuevo: 'usuario' })
  })

  it('400 (no es staff, es administradora o cambió mientras tanto) conserva el mensaje', async () => {
    responder(400, { codigo: 'VALIDACION', mensaje: 'El rol de esta persona cambió mientras tanto.' })

    await expect(revocar('u-3')).rejects.toMatchObject({ estado: 400, mensajeParaUsuario: 'El rol de esta persona cambió mientras tanto.' })
  })
})

describe('registros', () => {
  const rolRegistro = { id: 'r-1', administradorId: 'u-2', administrador: 'admin.n', usuarioAfectadoId: 'u-3', usuarioAfectado: 'ana.l', rolAnterior: 'usuario', rolNuevo: 'staff', ocurrioEn: '2026-11-01T10:00:00-05:00' }
  const accesoRegistro = { id: 'a-1', usuarioId: 'u-4', nombreDeUsuario: 'pedro.m', ocurrioEn: '2026-11-01T11:00:00-05:00', ip: '203.0.113.7', recurso: 'GET /api/admin/staff', rolRequerido: 'administrador' }

  it('los cambios de rol se piden con límite y desplazamiento', async () => {
    const falso = responder(200, { registros: [rolRegistro], hayMas: true })

    const pagina = await listarCambiosDeRol({ limite: 10, desplazamiento: 20 })

    expect(String(falso.mock.calls[0]?.[0])).toBe('/api/admin/auditoria/roles?limite=10&desplazamiento=20')
    expect(pagina).toEqual({ registros: [{ id: 'r-1', administrador: 'admin.n', usuarioAfectado: 'ana.l', rolAnterior: 'usuario', rolNuevo: 'staff', fecha: '2026-11-01T10:00:00-05:00' }], hayMas: true })
  })

  it('si una persona ya no existe, su nombre llega como null y se conserva así', async () => {
    responder(200, { registros: [{ ...rolRegistro, administrador: null, usuarioAfectado: null }], hayMas: false })

    expect((await listarCambiosDeRol({ limite: 10, desplazamiento: 0 })).registros[0]).toMatchObject({ administrador: null, usuarioAfectado: null })
  })

  it('no entrega los ids de las personas a la pantalla', async () => {
    responder(200, { registros: [rolRegistro], hayMas: false })

    expect(JSON.stringify(await listarCambiosDeRol({ limite: 10, desplazamiento: 0 }))).not.toMatch(/"u-2"|"u-3"/)
  })

  it('los accesos denegados se piden con límite y desplazamiento y se traducen', async () => {
    const falso = responder(200, { registros: [accesoRegistro], hayMas: false })

    const pagina = await listarAccesosDenegados({ limite: 10, desplazamiento: 0 })

    expect(String(falso.mock.calls[0]?.[0])).toBe('/api/admin/auditoria/accesos?limite=10&desplazamiento=0')
    expect(pagina.registros).toEqual([{ id: 'a-1', usuario: 'pedro.m', recurso: 'GET /api/admin/staff', rolRequerido: 'administrador', ip: '203.0.113.7', fecha: '2026-11-01T11:00:00-05:00' }])
  })

  it('un acceso sin IP o de una persona eliminada se conserva como null', async () => {
    responder(200, { registros: [{ ...accesoRegistro, nombreDeUsuario: null, ip: null }], hayMas: false })

    expect((await listarAccesosDenegados({ limite: 10, desplazamiento: 0 })).registros[0]).toMatchObject({ usuario: null, ip: null })
  })

  it('un rol desconocido en un registro falla', async () => {
    responder(200, { registros: [{ ...rolRegistro, rolNuevo: 'dios' }], hayMas: false })

    await expect(listarCambiosDeRol({ limite: 10, desplazamiento: 0 })).rejects.toThrow('rol desconocido')
  })

  it('sin permiso, 403 llega con su estado', async () => {
    responder(403, { codigo: 'ACCESO_DENEGADO', mensaje: 'No tienes permiso para esta acción.' })

    await expect(listarAccesosDenegados({ limite: 10, desplazamiento: 0 })).rejects.toMatchObject({ estado: 403 })
  })
})
