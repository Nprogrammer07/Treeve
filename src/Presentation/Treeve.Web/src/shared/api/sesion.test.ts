import { beforeEach, describe, expect, it, vi } from 'vitest'

const sesionDePrueba = { usuarioId: 'u-1', apodo: 'Ani', token: 'token-secreto', expiraEn: '2999-01-01T00:00:00Z' }

// El módulo guarda la sesión en memoria: cada prueba lo carga de nuevo para simular una página recién abierta.
async function abrirModulo() {
  vi.resetModules()
  return import('./sesion.ts')
}

describe('sesión', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('no hay sesión al empezar', async () => {
    const sesion = await abrirModulo()

    expect(sesion.leerSesion()).toBeNull()
    expect(sesion.obtenerToken()).toBeNull()
  })

  it('guarda la sesión y avisa a quien esté escuchando', async () => {
    const sesion = await abrirModulo()
    const oyente = vi.fn<() => void>()
    sesion.suscribirseASesion(oyente)

    sesion.guardarSesion(sesionDePrueba)

    expect(sesion.leerSesion()).toEqual(sesionDePrueba)
    expect(sesion.obtenerToken()).toBe('token-secreto')
    expect(oyente).toHaveBeenCalledOnce()
  })

  it('sobrevive a recargar la página en la misma pestaña', async () => {
    const primera = await abrirModulo()
    primera.guardarSesion(sesionDePrueba)

    const recargada = await abrirModulo()

    expect(recargada.leerSesion()).toEqual(sesionDePrueba)
  })

  it('descarta una sesión vencida', async () => {
    window.sessionStorage.setItem('treeve.sesion', JSON.stringify({ ...sesionDePrueba, expiraEn: '2000-01-01T00:00:00Z' }))

    const sesion = await abrirModulo()

    expect(sesion.leerSesion()).toBeNull()
    expect(window.sessionStorage.getItem('treeve.sesion')).toBeNull()
  })

  it('ignora datos guardados con otra forma', async () => {
    window.sessionStorage.setItem('treeve.sesion', JSON.stringify({ token: 1 }))

    const sesion = await abrirModulo()

    expect(sesion.leerSesion()).toBeNull()
  })

  it('al borrarla, la olvida y avisa', async () => {
    const sesion = await abrirModulo()
    sesion.guardarSesion(sesionDePrueba)
    const oyente = vi.fn<() => void>()
    sesion.suscribirseASesion(oyente)

    sesion.borrarSesion()

    expect(sesion.leerSesion()).toBeNull()
    expect(window.sessionStorage.getItem('treeve.sesion')).toBeNull()
    expect(oyente).toHaveBeenCalledOnce()
  })
})
