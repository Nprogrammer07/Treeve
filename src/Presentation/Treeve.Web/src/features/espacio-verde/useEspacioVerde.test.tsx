import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { loteDePrueba } from '../../test/loteDePrueba.ts'
import type { Lote } from './lote.ts'
import { useEspacioVerde } from './useEspacioVerde.ts'

describe('useEspacioVerde', () => {
  it('empieza cargando, sin lote y sin fallo', () => {
    const { result } = renderHook(() => useEspacioVerde(() => new Promise(() => {})))

    expect(result.current).toMatchObject({ lote: null, cargando: true, fallo: false })
  })

  it('al llegar el lote, deja de cargar y lo entrega', async () => {
    const consultar = vi.fn<() => Promise<Lote>>().mockResolvedValue(loteDePrueba())
    const { result } = renderHook(() => useEspacioVerde(consultar))

    await waitFor(() => expect(result.current.cargando).toBe(false))

    expect(result.current.lote).toEqual(loteDePrueba())
    expect(result.current.fallo).toBe(false)
    expect(consultar).toHaveBeenCalledOnce()
  })

  it('si falla, lo dice y no inventa un lote', async () => {
    const { result } = renderHook(() => useEspacioVerde(() => Promise.reject(new Error('caída'))))

    await waitFor(() => expect(result.current.fallo).toBe(true))

    expect(result.current.lote).toBeNull()
    expect(result.current.cargando).toBe(false)
  })

  it('reintentar vuelve a pedirlo y, si esta vez llega, se recupera', async () => {
    const consultar = vi.fn<() => Promise<Lote>>().mockRejectedValueOnce(new Error('caída')).mockResolvedValue(loteDePrueba())
    const { result } = renderHook(() => useEspacioVerde(consultar))
    await waitFor(() => expect(result.current.fallo).toBe(true))

    act(() => result.current.reintentar())

    await waitFor(() => expect(result.current.lote).toEqual(loteDePrueba()))
    expect(result.current.fallo).toBe(false)
    expect(consultar).toHaveBeenCalledTimes(2)
  })

  it('recargar entrega el lote nuevo y lo deja como el actual', async () => {
    const consultar = vi.fn<() => Promise<Lote>>().mockResolvedValueOnce(loteDePrueba()).mockResolvedValue(loteDePrueba({ riegos: 8, nutricion: 2, riegosParaElSiguiente: 1 }))
    const { result } = renderHook(() => useEspacioVerde(consultar))
    await waitFor(() => expect(result.current.lote).not.toBeNull())

    let nuevo: Lote | null = null
    await act(async () => {
      nuevo = await result.current.recargar()
    })

    expect(nuevo).toMatchObject({ riegos: 8 })
    expect(result.current.lote).toMatchObject({ riegos: 8 })
  })

  it('si recargar falla, devuelve null y conserva el último lote bueno en vez de borrar el espacio verde', async () => {
    const consultar = vi.fn<() => Promise<Lote>>().mockResolvedValueOnce(loteDePrueba()).mockRejectedValue(new Error('caída'))
    const { result } = renderHook(() => useEspacioVerde(consultar))
    await waitFor(() => expect(result.current.lote).not.toBeNull())

    let nuevo: Lote | null = loteDePrueba()
    await act(async () => {
      nuevo = await result.current.recargar()
    })

    expect(nuevo).toBeNull()
    expect(result.current.lote).toEqual(loteDePrueba())
    expect(result.current.fallo).toBe(false)
  })
})
