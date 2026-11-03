import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EquipoActual } from './EquipoActual.tsx'
import type { MiembroDelEquipo } from './tipos.ts'

const equipo: MiembroDelEquipo[] = [
  { id: 'u-1', usuario: 'admin.n', apodo: 'Nico', rol: 'administrador' },
  { id: 'u-2', usuario: 'ana.l', apodo: 'Ani', rol: 'staff' },
  { id: 'u-3', usuario: 'juanj', apodo: 'Juan', rol: 'staff' },
]

const tabla = (extra: Partial<Parameters<typeof EquipoActual>[0]> = {}) => <EquipoActual equipo={equipo} cargando={false} fallo={false} onReintentar={() => {}} onQuitar={() => {}} {...extra} />

describe('EquipoActual', () => {
  it('es una tabla accesible: con título y cuatro columnas con encabezado', () => {
    render(tabla())

    expect(screen.getByRole('table', { name: 'Personas con rol de staff o de administración' })).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Usuario', 'Apodo', 'Rol', 'Acciones'])
  })

  it('muestra usuario, apodo y rol escrito de cada persona', () => {
    render(tabla())

    const fila = within(screen.getByText('ana.l').closest('tr') as HTMLElement)
    expect(fila.getByText('Ani')).toBeInTheDocument()
    expect(fila.getByText('Staff')).toBeInTheDocument()
    expect(within(screen.getByText('admin.n').closest('tr') as HTMLElement).getByText('Administración')).toBeInTheDocument()
  })

  it('cada persona de staff tiene su botón "Quitar del staff", nombrado con su usuario', () => {
    const onQuitar = vi.fn<(m: MiembroDelEquipo) => void>()
    render(tabla({ onQuitar }))

    fireEvent.click(screen.getByRole('button', { name: 'Quitar a juanj del staff' }))

    expect(screen.getAllByRole('button', { name: /^Quitar a / })).toHaveLength(2)
    expect(onQuitar).toHaveBeenCalledWith(equipo[2])
  })

  it('la administración no tiene botón: su rol no se cambia desde la aplicación', () => {
    render(tabla())

    const fila = within(screen.getByText('admin.n').closest('tr') as HTMLElement)
    expect(fila.queryByRole('button')).not.toBeInTheDocument()
    expect(fila.getByText('No se cambia desde la aplicación')).toBeInTheDocument()
  })

  it('avisa que la lista nunca muestra nombres completos ni correos', () => {
    render(tabla())

    expect(screen.getByText(/nunca muestra nombres completos ni correos/)).toBeInTheDocument()
  })

  it('mientras carga lo dice y no muestra la tabla', () => {
    render(tabla({ equipo: [], cargando: true }))

    expect(screen.getByText('Cargando el equipo…').tagName).toBe('OUTPUT')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('si no se pudo cargar, avisa y permite reintentar', () => {
    const onReintentar = vi.fn<() => void>()
    render(tabla({ equipo: [], fallo: true, onReintentar }))

    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar el equipo')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(onReintentar).toHaveBeenCalledOnce()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
