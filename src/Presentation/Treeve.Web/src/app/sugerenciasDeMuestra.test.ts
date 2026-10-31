import { describe, expect, it } from 'vitest'
import type { ConsultaSugerencias } from '../features/panel-staff/tipos.ts'
import { crearFuenteDeMuestra, crearSugerenciasDeMuestra } from './sugerenciasDeMuestra.ts'

const inicial: ConsultaSugerencias = { limite: 10, desplazamiento: 0 }
const fuente = () => crearFuenteDeMuestra(crearSugerenciasDeMuestra(), 0)

describe('sugerencias de muestra (solo desarrollo)', () => {
  it('reproduce la distribución del diseño: 1.240 en total', async () => {
    expect(await fuente().resumen?.()).toEqual({ total: 1240, pendientes: 42, enRevision: 18, implementadas: 1137, rechazadas: 43 })
  })

  it('cada sugerencia tiene un identificador único', () => {
    expect(new Set(crearSugerenciasDeMuestra().map((s) => s.id)).size).toBe(1240)
  })

  it('pagina con límite y desplazamiento y avisa si hay más, como la API real', async () => {
    const primera = await fuente().consultar(inicial)
    const ultima = await fuente().consultar({ ...inicial, desplazamiento: 1230 })

    expect(primera.items).toHaveLength(10)
    expect(primera.hayMas).toBe(true)
    expect(ultima.items).toHaveLength(10)
    expect(ultima.hayMas).toBe(false)
    expect((await fuente().consultar({ ...inicial, desplazamiento: 1240 })).items).toHaveLength(0)
  })

  it('filtra por estado', async () => {
    const pagina = await fuente().consultar({ ...inicial, estado: 'pendiente', limite: 100 })

    expect(pagina.items).toHaveLength(42)
    expect(pagina.items.every((s) => s.estado === 'pendiente')).toBe(true)
  })

  it('filtra por nombre de usuario exacto, sin distinguir mayúsculas', async () => {
    const pagina = await fuente().consultar({ ...inicial, usuario: 'TREBOL65', limite: 100 })

    expect(pagina.items.length).toBeGreaterThan(0)
    expect(pagina.items.every((s) => s.usuario === 'trebol65')).toBe(true)
    expect((await fuente().consultar({ ...inicial, usuario: 'trebol' })).items).toHaveLength(0)
  })

  it('por defecto va de la más reciente a la más antigua', async () => {
    const fechas = (await fuente().consultar({ ...inicial, limite: 100 })).items.map((s) => s.fecha)

    expect(fechas).toEqual([...fechas].sort((a, b) => b.localeCompare(a)))
  })

  it('ordena de las más antiguas a las más recientes con orden "antiguas"', async () => {
    const fechas = (await fuente().consultar({ ...inicial, orden: 'antiguas', limite: 100 })).items.map((s) => s.fecha)

    expect(fechas).toEqual([...fechas].sort((a, b) => a.localeCompare(b)))
  })

  it('con orden "usuario" va de la A a la Z y, dentro de cada persona, la más reciente primero', async () => {
    const items = (await fuente().consultar({ ...inicial, orden: 'usuario', limite: 100 })).items

    const usuarios = items.map((s) => s.usuario)
    expect(usuarios).toEqual([...usuarios].sort((a, b) => a.localeCompare(b)))
    const deUna = items.filter((s) => s.usuario === usuarios[0]).map((s) => s.fecha)
    expect(deUna).toEqual([...deUna].sort((a, b) => b.localeCompare(a)))
  })

  it('filtra por rango de fechas, con el último día incluido', async () => {
    const pagina = await fuente().consultar({ ...inicial, desde: '2026-10-15', hasta: '2026-10-16', limite: 100 })

    expect(pagina.items.length).toBeGreaterThan(0)
    expect(pagina.items.every((s) => s.fecha.slice(0, 10) >= '2026-10-15' && s.fecha.slice(0, 10) <= '2026-10-16')).toBe(true)
  })

  it('al actualizar cambia el estado, guarda el comentario y el resumen lo refleja', async () => {
    const f = fuente()
    const [primera] = (await f.consultar({ ...inicial, estado: 'pendiente' })).items

    const resultado = await f.actualizar?.(primera?.id ?? '', { estado: 'implementada', comentario: 'Ya está' })

    expect(resultado).toEqual({ huboCambios: true })
    expect(await f.resumen?.()).toMatchObject({ pendientes: 41, implementadas: 1138 })
    const guardada = (await f.consultar({ ...inicial, estado: 'implementada', limite: 100 })).items.find((s) => s.id === primera?.id)
    expect(guardada).toMatchObject({ comentario: 'Ya está' })
    expect(guardada?.gestionadaEn).toBeDefined()
  })

  it('si se envía lo mismo que ya había, no hubo cambios y no se guarda nada', async () => {
    const f = fuente()
    const [primera] = (await f.consultar({ ...inicial, estado: 'pendiente' })).items

    const resultado = await f.actualizar?.(primera?.id ?? '', { estado: 'pendiente' })

    expect(resultado).toEqual({ huboCambios: false })
    expect((await f.resumen?.())?.pendientes).toBe(42)
  })

  it('un comentario vacío quita el comentario', async () => {
    const f = fuente()
    const [primera] = (await f.consultar({ ...inicial, estado: 'pendiente' })).items
    await f.actualizar?.(primera?.id ?? '', { comentario: 'Lo vemos' })

    await f.actualizar?.(primera?.id ?? '', { comentario: '' })

    const despues = (await f.consultar({ ...inicial, estado: 'pendiente', limite: 100 })).items.find((s) => s.id === primera?.id)
    expect(despues?.comentario).toBeUndefined()
  })

  it('rechaza actualizar una sugerencia que no existe', async () => {
    await expect(fuente().actualizar?.('SUG-0', { estado: 'rechazada' })).rejects.toThrow('No existe esa sugerencia')
  })
})
