import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ConsultaDeRegistros, PaginaDeRegistros } from './tipos.ts'
import { usePaginaDeRegistros } from './usePaginaDeRegistros.ts'

type Pagina = PaginaDeRegistros<{ id: string }>
type Cargar = (c: ConsultaDeRegistros) => Promise<Pagina>
const pagina = (ids: string[], hayMas = true): Pagina => ({ registros: ids.map((id) => ({ id })), hayMas })

describe('usePaginaDeRegistros', () => {
  it('empieza cargando, sin filas y sin fallo, y pide 10 desde el principio', async () => {
    const cargar = vi.fn<Cargar>().mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => usePaginaDeRegistros(cargar, 0))

    expect(result.current).toMatchObject({ registros: [], cargando: true, fallo: false, hayMas: false, desplazamiento: 0 })
    expect(cargar).toHaveBeenCalledWith({ limite: 10, desplazamiento: 0 })
  })

  it('al llegar la página, deja de cargar y la entrega con su "hay más"', async () => {
    const cargar = vi.fn<Cargar>().mockResolvedValue(pagina(['a', 'b']))
    const { result } = renderHook(() => usePaginaDeRegistros(cargar, 0))

    await waitFor(() => expect(result.current.cargando).toBe(false))

    expect(result.current.registros).toEqual([{ id: 'a' }, { id: 'b' }])
    expect(result.current.hayMas).toBe(true)
  })

  it('"siguiente" suma 10 al desplazamiento y "anterior" lo resta, sin bajar de cero', async () => {
    const cargar = vi.fn<Cargar>().mockResolvedValue(pagina(['a']))
    const { result } = renderHook(() => usePaginaDeRegistros(cargar, 0))
    await waitFor(() => expect(result.current.cargando).toBe(false))

    act(() => result.current.siguiente())
    await waitFor(() => expect(cargar).toHaveBeenLastCalledWith({ limite: 10, desplazamiento: 10 }))
    await waitFor(() => expect(result.current.cargando).toBe(false))
    act(() => result.current.anterior())
    await waitFor(() => expect(cargar).toHaveBeenLastCalledWith({ limite: 10, desplazamiento: 0 }))
    await waitFor(() => expect(result.current.cargando).toBe(false))
    act(() => result.current.anterior())

    expect(result.current.desplazamiento).toBe(0)
  })

  it('mientras llega la página nueva no muestra las filas de la anterior', async () => {
    const cargar = vi.fn<Cargar>().mockResolvedValueOnce(pagina(['a'])).mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => usePaginaDeRegistros(cargar, 0))
    await waitFor(() => expect(result.current.registros).toHaveLength(1))

    act(() => result.current.siguiente())

    expect(result.current.cargando).toBe(true)
    expect(result.current.registros).toEqual([])
  })

  it('si falla, lo dice y no inventa filas; al reintentar se recupera', async () => {
    const cargar = vi.fn<Cargar>().mockRejectedValueOnce(new Error('caída')).mockResolvedValue(pagina(['a']))
    const { result } = renderHook(() => usePaginaDeRegistros(cargar, 0))
    await waitFor(() => expect(result.current.fallo).toBe(true))
    expect(result.current.registros).toEqual([])

    act(() => result.current.reintentar())

    expect(result.current.cargando).toBe(true)
    await waitFor(() => expect(result.current.registros).toEqual([{ id: 'a' }]))
    expect(result.current.fallo).toBe(false)
  })

  it('si cambia la versión (por ejemplo, tras ascender a alguien) vuelve a la primera página y pide de nuevo', async () => {
    const cargar = vi.fn<Cargar>().mockResolvedValue(pagina(['a']))
    const { result, rerender } = renderHook(({ version }) => usePaginaDeRegistros(cargar, version), { initialProps: { version: 0 } })
    await waitFor(() => expect(result.current.cargando).toBe(false))
    act(() => result.current.siguiente())
    await waitFor(() => expect(result.current.desplazamiento).toBe(10))

    rerender({ version: 1 })

    expect(result.current.desplazamiento).toBe(0)
    await waitFor(() => expect(cargar).toHaveBeenLastCalledWith({ limite: 10, desplazamiento: 0 }))
  })

  it('una respuesta lenta de una página vieja no pisa a la más reciente', async () => {
    let responderLaVieja: (p: Pagina) => void = () => {}
    const cargar = vi
      .fn<Cargar>()
      .mockReturnValueOnce(new Promise((resolver) => (responderLaVieja = resolver)))
      .mockResolvedValue(pagina(['nueva']))
    const { result } = renderHook(() => usePaginaDeRegistros(cargar, 0))

    act(() => result.current.siguiente())
    await waitFor(() => expect(result.current.registros).toEqual([{ id: 'nueva' }]))
    await act(async () => {
      responderLaVieja(pagina(['vieja']))
      await Promise.resolve()
    })

    expect(result.current.registros).toEqual([{ id: 'nueva' }])
  })
})
