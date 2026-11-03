import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { MiembroDelEquipo } from './tipos.ts'
import { useEquipo } from './useEquipo.ts'

const miembro = (usuario: string): MiembroDelEquipo => ({ id: `id-${usuario}`, usuario, apodo: usuario, rol: 'staff' })

describe('useEquipo', () => {
  it('empieza cargando, sin lista y sin fallo', () => {
    const { result } = renderHook(() => useEquipo(0, () => new Promise(() => {})))

    expect(result.current).toMatchObject({ equipo: [], cargando: true, fallo: false })
  })

  it('al llegar la lista, deja de cargar y la entrega', async () => {
    const listar = vi.fn<() => Promise<MiembroDelEquipo[]>>().mockResolvedValue([miembro('ana.l')])
    const { result } = renderHook(() => useEquipo(0, listar))

    await waitFor(() => expect(result.current.cargando).toBe(false))

    expect(result.current.equipo).toEqual([miembro('ana.l')])
    expect(result.current.fallo).toBe(false)
  })

  it('si la primera carga falla, lo dice y no inventa un equipo; al reintentar se recupera', async () => {
    const listar = vi.fn<() => Promise<MiembroDelEquipo[]>>().mockRejectedValueOnce(new Error('caída')).mockResolvedValue([miembro('ana.l')])
    const { result } = renderHook(() => useEquipo(0, listar))
    await waitFor(() => expect(result.current.fallo).toBe(true))
    expect(result.current.equipo).toEqual([])

    act(() => result.current.reintentar())

    expect(result.current.cargando).toBe(true)
    await waitFor(() => expect(result.current.equipo).toHaveLength(1))
    expect(result.current.fallo).toBe(false)
  })

  it('si la versión cambia, vuelve a pedir y mientras tanto sigue mostrando la lista anterior', async () => {
    const listar = vi.fn<() => Promise<MiembroDelEquipo[]>>().mockResolvedValueOnce([miembro('ana.l')]).mockReturnValueOnce(new Promise(() => {}))
    const { result, rerender } = renderHook(({ version }) => useEquipo(version, listar), { initialProps: { version: 0 } })
    await waitFor(() => expect(result.current.equipo).toHaveLength(1))

    rerender({ version: 1 })

    expect(listar).toHaveBeenCalledTimes(2)
    expect(result.current.equipo).toEqual([miembro('ana.l')])
    expect(result.current.cargando).toBe(false)
  })

  it('si falla al volver a pedir, conserva la última lista buena en vez de borrar el equipo', async () => {
    const listar = vi.fn<() => Promise<MiembroDelEquipo[]>>().mockResolvedValueOnce([miembro('ana.l')]).mockRejectedValue(new Error('caída'))
    const { result, rerender } = renderHook(({ version }) => useEquipo(version, listar), { initialProps: { version: 0 } })
    await waitFor(() => expect(result.current.equipo).toHaveLength(1))

    rerender({ version: 1 })
    await waitFor(() => expect(listar).toHaveBeenCalledTimes(2))

    expect(result.current.equipo).toEqual([miembro('ana.l')])
    expect(result.current.fallo).toBe(false)
  })
})
