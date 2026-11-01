import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useNotificaciones } from './useNotificaciones.ts'
import type { Notificacion } from './tipos.ts'

const aviso = (id: string, extra: Partial<Notificacion> = {}): Notificacion => ({ id, tipo: 'sugerencia_respondida', mensaje: `Aviso ${id}`, creadaEn: '2026-10-31T10:00:00-05:00', leida: false, ...extra })

const lista = [aviso('n-3'), aviso('n-2'), aviso('n-1', { leida: true })]

function preparar(avisos: Notificacion[] = lista) {
  const listar = vi.fn<() => Promise<Notificacion[]>>().mockResolvedValue(avisos)
  const marcar = vi.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined)
  const hook = renderHook(() => useNotificaciones(listar, marcar))
  return { listar, marcar, ...hook }
}

describe('useNotificaciones', () => {
  it('empieza cargando, sin avisos', () => {
    const { result } = renderHook(() => useNotificaciones(() => new Promise(() => {})))

    expect(result.current).toMatchObject({ notificaciones: [], sinLeer: 0, cargando: true, fallo: false })
  })

  it('al llegar la lista, deja de cargar y cuenta los que siguen sin leer', async () => {
    const { result } = preparar()

    await waitFor(() => expect(result.current.cargando).toBe(false))

    expect(result.current.notificaciones).toEqual(lista)
    expect(result.current.sinLeer).toBe(2)
    expect(result.current.fallo).toBe(false)
  })

  it('si la primera carga falla, lo dice y no inventa avisos', async () => {
    const { result } = renderHook(() => useNotificaciones(() => Promise.reject(new Error('caída'))))

    await waitFor(() => expect(result.current.fallo).toBe(true))

    expect(result.current.notificaciones).toEqual([])
    expect(result.current.cargando).toBe(false)
  })

  it('al reintentar después de un fallo vuelve a mostrar "cargando" y se recupera', async () => {
    const listar = vi.fn<() => Promise<Notificacion[]>>().mockRejectedValueOnce(new Error('caída')).mockResolvedValue(lista)
    const { result } = renderHook(() => useNotificaciones(listar, () => Promise.resolve()))
    await waitFor(() => expect(result.current.fallo).toBe(true))

    act(() => result.current.recargar())

    expect(result.current.cargando).toBe(true)
    expect(result.current.fallo).toBe(false)
    await waitFor(() => expect(result.current.notificaciones).toEqual(lista))
  })

  it('recargar trae la lista nueva y si falla conserva la que ya había', async () => {
    const listar = vi.fn<() => Promise<Notificacion[]>>().mockResolvedValueOnce(lista).mockResolvedValueOnce([aviso('n-4'), ...lista]).mockRejectedValue(new Error('caída'))
    const { result } = renderHook(() => useNotificaciones(listar, () => Promise.resolve()))
    await waitFor(() => expect(result.current.notificaciones).toHaveLength(3))

    act(() => result.current.recargar())
    await waitFor(() => expect(result.current.notificaciones).toHaveLength(4))
    act(() => result.current.recargar())
    await waitFor(() => expect(listar).toHaveBeenCalledTimes(3))

    expect(result.current.notificaciones).toHaveLength(4)
    expect(result.current.fallo).toBe(false)
  })

  it('al volver a la pestaña actualiza la lista una vez, sin consultas cada pocos segundos', async () => {
    const { result, listar } = preparar()
    await waitFor(() => expect(result.current.cargando).toBe(false))
    expect(listar).toHaveBeenCalledOnce()

    act(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    await waitFor(() => expect(listar).toHaveBeenCalledTimes(2))
  })

  it('al ocultar la pestaña no consulta', async () => {
    const { result, listar } = preparar()
    await waitFor(() => expect(result.current.cargando).toBe(false))

    act(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(listar).toHaveBeenCalledOnce()
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  })

  describe('marcar como leído', () => {
    it('se ve al instante y se avisa a la API', async () => {
      const { result, marcar } = preparar()
      await waitFor(() => expect(result.current.sinLeer).toBe(2))

      await act(async () => {
        await result.current.marcarLeida('n-3')
      })

      expect(marcar).toHaveBeenCalledWith('n-3')
      expect(result.current.sinLeer).toBe(1)
      expect(result.current.notificaciones.find((n) => n.id === 'n-3')?.leida).toBe(true)
      expect(result.current.falloAlMarcar).toBe(false)
    })

    it('si la API falla, el aviso vuelve a verse sin leer y se avisa del fallo', async () => {
      const { result, marcar } = preparar()
      marcar.mockRejectedValue(new Error('caída'))
      await waitFor(() => expect(result.current.sinLeer).toBe(2))

      await act(async () => {
        await result.current.marcarLeida('n-3')
      })

      expect(result.current.sinLeer).toBe(2)
      expect(result.current.falloAlMarcar).toBe(true)
    })

    it('un intento nuevo limpia el aviso de fallo anterior', async () => {
      const { result, marcar } = preparar()
      marcar.mockRejectedValueOnce(new Error('caída'))
      await waitFor(() => expect(result.current.sinLeer).toBe(2))
      await act(async () => {
        await result.current.marcarLeida('n-3')
      })
      expect(result.current.falloAlMarcar).toBe(true)

      await act(async () => {
        await result.current.marcarLeida('n-3')
      })

      expect(result.current.falloAlMarcar).toBe(false)
      expect(result.current.sinLeer).toBe(1)
    })

    it('"todos" marca solo los que estaban sin leer', async () => {
      const { result, marcar } = preparar()
      await waitFor(() => expect(result.current.sinLeer).toBe(2))

      await act(async () => {
        await result.current.marcarTodasLeidas()
      })

      expect(marcar).toHaveBeenCalledTimes(2)
      expect(marcar).not.toHaveBeenCalledWith('n-1')
      expect(result.current.sinLeer).toBe(0)
    })

    it('si "todos" falla en alguno, solo ese vuelve a verse sin leer', async () => {
      const { result, marcar } = preparar()
      marcar.mockImplementation((id) => (id === 'n-2' ? Promise.reject(new Error('caída')) : Promise.resolve()))
      await waitFor(() => expect(result.current.sinLeer).toBe(2))

      await act(async () => {
        await result.current.marcarTodasLeidas()
      })

      expect(result.current.notificaciones.map((n) => [n.id, n.leida])).toEqual([
        ['n-3', true],
        ['n-2', false],
        ['n-1', true],
      ])
      expect(result.current.falloAlMarcar).toBe(true)
    })

    it('una lista pedida ANTES de marcar que responde DESPUÉS no desmarca el aviso (carrera)', async () => {
      let responderLaVieja: (avisos: Notificacion[]) => void = () => {}
      const listar = vi.fn<() => Promise<Notificacion[]>>().mockResolvedValueOnce(lista).mockReturnValueOnce(new Promise((resolver) => (responderLaVieja = resolver)))
      const { result } = renderHook(() => useNotificaciones(listar, () => Promise.resolve()))
      await waitFor(() => expect(result.current.sinLeer).toBe(2))

      act(() => result.current.recargar())
      await act(async () => {
        await result.current.marcarLeida('n-3')
      })
      expect(result.current.sinLeer).toBe(1)
      await act(async () => {
        responderLaVieja(lista)
        await Promise.resolve()
      })

      expect(result.current.notificaciones.find((n) => n.id === 'n-3')?.leida).toBe(true)
      expect(result.current.sinLeer).toBe(1)
    })

    it('si marcar falló, una lista nueva sí lo trae sin leer: no queda marcado a la fuerza', async () => {
      const listar = vi.fn<() => Promise<Notificacion[]>>().mockResolvedValue(lista)
      const marcar = vi.fn<(id: string) => Promise<void>>().mockRejectedValue(new Error('caída'))
      const { result } = renderHook(() => useNotificaciones(listar, marcar))
      await waitFor(() => expect(result.current.sinLeer).toBe(2))
      await act(async () => {
        await result.current.marcarLeida('n-3')
      })

      act(() => result.current.recargar())
      await waitFor(() => expect(listar).toHaveBeenCalledTimes(2))

      expect(result.current.notificaciones.find((n) => n.id === 'n-3')?.leida).toBe(false)
    })
  })
})
