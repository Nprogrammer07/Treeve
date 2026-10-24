import { describe, expect, it } from 'vitest'
import type { ConsultaSugerencias } from '../features/panel-staff/tipos.ts'
import { crearFuenteDeMuestra, crearSugerenciasDeMuestra } from './sugerenciasDeMuestra.ts'

const inicial: ConsultaSugerencias = { busqueda: '', estado: 'todos', orden: 'recientes', pagina: 1, tamano: 10 }
const fuente = () => crearFuenteDeMuestra(crearSugerenciasDeMuestra(), 0)

describe('sugerencias de muestra (solo desarrollo)', () => {
  it('reproduce la distribución del diseño: 1.240 en total', async () => {
    expect(await fuente().resumen()).toEqual({ total: 1240, pendientes: 42, enRevision: 18, implementadas: 1137, rechazadas: 43 })
  })

  it('cada sugerencia tiene un identificador único', () => {
    const ids = crearSugerenciasDeMuestra().map((s) => s.id)

    expect(new Set(ids).size).toBe(1240)
  })

  it('pagina de a 10: 124 páginas, la última también con 10', async () => {
    const primera = await fuente().consultar(inicial)
    const ultima = await fuente().consultar({ ...inicial, pagina: 124 })

    expect(primera).toMatchObject({ total: 1240 })
    expect(primera.items).toHaveLength(10)
    expect(ultima.items).toHaveLength(10)
    expect((await fuente().consultar({ ...inicial, pagina: 125 })).items).toHaveLength(0)
  })

  it('filtra por estado y el total refleja el filtro', async () => {
    expect((await fuente().consultar({ ...inicial, estado: 'pendiente' })).total).toBe(42)
    expect((await fuente().consultar({ ...inicial, estado: 'rechazada' })).total).toBe(43)
  })

  it('ordena por fecha en los dos sentidos', async () => {
    const recientes = (await fuente().consultar(inicial)).items
    const antiguas = (await fuente().consultar({ ...inicial, orden: 'antiguas' })).items

    expect(recientes[0]?.fecha.localeCompare(recientes[9]?.fecha ?? '')).toBeGreaterThanOrEqual(0)
    expect(antiguas[0]?.fecha.localeCompare(antiguas[9]?.fecha ?? '')).toBeLessThanOrEqual(0)
    expect(recientes[0]?.id).not.toBe(antiguas[0]?.id)
  })

  it('busca por apodo o por texto, sin distinguir mayúsculas', async () => {
    const porTexto = await fuente().consultar({ ...inicial, busqueda: 'LLUVIA' })

    expect(porTexto.total).toBeGreaterThan(0)
    expect(porTexto.items.every((s) => `${s.usuario} ${s.texto}`.toLowerCase().includes('lluvia'))).toBe(true)
  })

  it('filtra por rango de fechas, ambos días incluidos', async () => {
    const pagina = await fuente().consultar({ ...inicial, desde: '2026-10-15', hasta: '2026-10-16', tamano: 100 })

    expect(pagina.total).toBeGreaterThan(0)
    expect(pagina.items.every((s) => s.fecha.slice(0, 10) >= '2026-10-15' && s.fecha.slice(0, 10) <= '2026-10-16')).toBe(true)
  })

  it('al actualizar cambia el estado y el resumen lo refleja', async () => {
    const f = fuente()
    const [primera] = (await f.consultar({ ...inicial, estado: 'pendiente' })).items

    await f.actualizar(primera?.id ?? '', { estado: 'implementada', comentario: 'Ya está' })

    expect(await f.resumen()).toMatchObject({ pendientes: 41, implementadas: 1138 })
    expect((await f.consultar({ ...inicial, estado: 'implementada', busqueda: '' , tamano: 1240 })).items.find((s) => s.id === primera?.id)?.comentario).toBe('Ya está')
  })

  it('rechaza actualizar una sugerencia que no existe', async () => {
    await expect(fuente().actualizar('SUG-0', { estado: 'rechazada' })).rejects.toThrow('No existe esa sugerencia')
  })
})
