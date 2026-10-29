import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { leerTokenDeLaDireccion, olvidarToken, reiniciarLecturaDelToken } from './tokenDeRecuperacion.ts'

describe('token del enlace de recuperación', () => {
  beforeEach(() => {
    reiniciarLecturaDelToken()
  })

  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('lee el token de la dirección', () => {
    window.history.replaceState(null, '', '/restablecer-contrasena?token=abc123')

    expect(leerTokenDeLaDireccion()).toBe('abc123')
  })

  it('apenas lo lee, lo borra de la barra de direcciones y deja la ruta', () => {
    window.history.replaceState(null, '', '/restablecer-contrasena?token=abc123&otro=1')

    leerTokenDeLaDireccion()

    expect(window.location.search).toBe('')
    expect(window.location.pathname).toBe('/restablecer-contrasena')
    expect(window.location.href).not.toContain('abc123')
  })

  it('al borrarlo usa replaceState, no pushState: no deja una entrada extra en el historial', () => {
    window.history.replaceState(null, '', '/restablecer-contrasena?token=abc123')
    const reemplazar = vi.spyOn(window.history, 'replaceState')
    const agregar = vi.spyOn(window.history, 'pushState')

    leerTokenDeLaDireccion()

    expect(reemplazar).toHaveBeenCalledOnce()
    expect(agregar).not.toHaveBeenCalled()
    reemplazar.mockRestore()
    agregar.mockRestore()
  })

  it('es idempotente: leerlo de nuevo devuelve el mismo token aunque la dirección ya esté limpia', () => {
    window.history.replaceState(null, '', '/restablecer-contrasena?token=abc123')

    expect(leerTokenDeLaDireccion()).toBe('abc123')
    expect(leerTokenDeLaDireccion()).toBe('abc123')
  })

  it('sin token en la dirección devuelve null', () => {
    window.history.replaceState(null, '', '/restablecer-contrasena')

    expect(leerTokenDeLaDireccion()).toBeNull()
  })

  it('un token vacío o de espacios cuenta como no haber token', () => {
    window.history.replaceState(null, '', '/restablecer-contrasena?token=%20%20')

    expect(leerTokenDeLaDireccion()).toBeNull()
  })

  it('al olvidarlo, ya no se puede recuperar', () => {
    window.history.replaceState(null, '', '/restablecer-contrasena?token=abc123')
    leerTokenDeLaDireccion()

    olvidarToken()

    expect(leerTokenDeLaDireccion()).toBeNull()
  })

  it('no lo guarda en ningún almacenamiento del navegador', () => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    window.history.replaceState(null, '', '/restablecer-contrasena?token=abc123')

    leerTokenDeLaDireccion()

    expect(JSON.stringify({ ...window.localStorage })).not.toContain('abc123')
    expect(JSON.stringify({ ...window.sessionStorage })).not.toContain('abc123')
  })
})
