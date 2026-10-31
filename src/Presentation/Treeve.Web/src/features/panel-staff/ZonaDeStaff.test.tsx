import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '../../shared/api/clienteApi.ts'
import type { FuenteDeSugerencias, RolDeStaff } from './tipos.ts'
import { ZonaDeStaff } from './ZonaDeStaff.tsx'

const fuente: FuenteDeSugerencias = {
  consultar: vi.fn<FuenteDeSugerencias['consultar']>().mockResolvedValue({ items: [{ id: 'SUG-1', usuario: 'ana.l', fecha: '2026-10-16T17:00:00Z', texto: 'Un modo oscuro', estado: 'pendiente' }], hayMas: false }),
}

const zona = (comprobarAcceso: () => Promise<RolDeStaff>, extra: Partial<Parameters<typeof ZonaDeStaff>[0]> = {}) => (
  <ZonaDeStaff comprobarAcceso={comprobarAcceso} fuente={fuente} apodo="Ani" onSalir={() => {}} onVolver={() => {}} {...extra} />
)

describe('ZonaDeStaff (HU-10)', () => {
  it('mientras comprueba el acceso no muestra el panel', () => {
    render(zona(() => new Promise(() => {})))

    expect(screen.getByText('Comprobando tu acceso…')).toBeInTheDocument()
    expect(screen.queryByText('Gestión de sugerencias')).not.toBeInTheDocument()
  })

  it('con el 200 de la API muestra el panel', async () => {
    render(zona(() => Promise.resolve('staff')))

    expect(await screen.findByRole('heading', { level: 1, name: 'Gestión de sugerencias' })).toBeInTheDocument()
    expect(await screen.findByText('ana.l')).toBeInTheDocument()
  })

  it('con el 403 dice "acceso denegado", sin mostrar nada del panel, y permite volver o salir', async () => {
    const onVolver = vi.fn<() => void>()
    const onSalir = vi.fn<() => void>()
    render(zona(() => Promise.reject(new ErrorApi(403, { codigo: 'ACCESO_DENEGADO' })), { onVolver, onSalir }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Acceso denegado' })).toBeInTheDocument()
    expect(screen.queryByText('Gestión de sugerencias')).not.toBeInTheDocument()
    expect(fuente.consultar).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Volver a Treeve' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(onVolver).toHaveBeenCalledOnce()
    expect(onSalir).toHaveBeenCalledOnce()
  })

  it('si la comprobación falla por otra causa, avisa con amabilidad y permite reintentar', async () => {
    const comprobar = vi.fn<() => Promise<RolDeStaff>>().mockRejectedValueOnce(new ErrorApi(500)).mockResolvedValue('staff')
    render(zona(comprobar))

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos comprobar tu acceso')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Gestión de sugerencias' })).toBeInTheDocument()
  })

  it('el botón de administración solo aparece si la API dice que es administrador', async () => {
    const { unmount } = render(zona(() => Promise.resolve('staff'), { onAdministracion: () => {} }))
    await screen.findByRole('heading', { level: 1, name: 'Gestión de sugerencias' })
    expect(screen.queryByRole('button', { name: 'Panel de Administración' })).not.toBeInTheDocument()
    unmount()

    render(zona(() => Promise.resolve('administrador'), { onAdministracion: () => {} }))

    expect(await screen.findByRole('button', { name: 'Panel de Administración' })).toBeInTheDocument()
  })

  it('un administrador no ve el botón mientras no exista la pantalla de administración (HU-12)', async () => {
    render(zona(() => Promise.resolve('administrador')))

    await screen.findByRole('heading', { level: 1, name: 'Gestión de sugerencias' })
    expect(screen.queryByRole('button', { name: 'Panel de Administración' })).not.toBeInTheDocument()
  })
})
