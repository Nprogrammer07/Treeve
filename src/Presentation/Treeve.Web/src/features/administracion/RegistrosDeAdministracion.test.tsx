import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RegistrosDeAdministracion } from './RegistrosDeAdministracion.tsx'
import type { ConsultaDeRegistros, PaginaDeRegistros, RegistroDeAcceso, RegistroDeRol } from './tipos.ts'

const cambio = (id: string, extra: Partial<RegistroDeRol> = {}): RegistroDeRol => ({ id, administrador: 'admin.n', usuarioAfectado: 'ana.l', rolAnterior: 'usuario', rolNuevo: 'staff', fecha: '2026-11-01T10:00:00-05:00', ...extra })
const acceso = (id: string, extra: Partial<RegistroDeAcceso> = {}): RegistroDeAcceso => ({ id, usuario: 'pedro.m', recurso: 'GET /api/admin/staff', rolRequerido: 'administrador', ip: '203.0.113.7', fecha: '2026-11-01T11:00:00-05:00', ...extra })

describe('RegistrosDeAdministracion', () => {
  const cargarCambios = vi.fn<(c: ConsultaDeRegistros) => Promise<PaginaDeRegistros<RegistroDeRol>>>()
  const cargarAccesos = vi.fn<(c: ConsultaDeRegistros) => Promise<PaginaDeRegistros<RegistroDeAcceso>>>()

  const registros = (version = 0) => <RegistrosDeAdministracion version={version} cargarCambios={cargarCambios} cargarAccesos={cargarAccesos} />

  beforeEach(() => {
    cargarCambios.mockReset().mockResolvedValue({ registros: [cambio('r-1'), cambio('r-2', { usuarioAfectado: 'sofi.r' })], hayMas: true })
    cargarAccesos.mockReset().mockResolvedValue({ registros: [acceso('a-1')], hayMas: false })
  })

  it('empieza en los cambios de rol y avisa que los registros solo se consultan', async () => {
    render(registros())

    expect(screen.getByRole('button', { name: 'Cambios de rol' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Accesos denegados' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('Solo se pueden consultar: no se pueden modificar ni borrar.')).toBeInTheDocument()
    await screen.findByRole('table')
    expect(screen.queryByRole('button', { name: /Editar|Borrar|Eliminar/ })).not.toBeInTheDocument()
  })

  describe('cambios de rol', () => {
    it('es una tabla accesible con fecha, quién lo hizo, a quién y el cambio', async () => {
      render(registros())

      expect(await screen.findByRole('table', { name: 'Cambios de rol, del más reciente al más antiguo' })).toBeInTheDocument()
      expect(screen.getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Fecha', 'Quién lo hizo', 'A quién', 'Cambio'])
      const fila = within(screen.getAllByRole('row')[1] as HTMLElement)
      expect(fila.getByText('1 nov 2026')).toBeInTheDocument()
      expect(fila.getByText('admin.n')).toBeInTheDocument()
      expect(fila.getByText('ana.l')).toBeInTheDocument()
    })

    it('el cambio se lee con palabras ("Usuario → Staff") y resalta el rol con acceso', async () => {
      cargarCambios.mockResolvedValue({ registros: [cambio('r-1'), cambio('r-2', { rolAnterior: 'staff', rolNuevo: 'usuario' })], hayMas: false })
      render(registros())

      const filas = await screen.findAllByRole('row')
      expect(filas[1]).toHaveTextContent('Usuario → Staff')
      expect(within(filas[1] as HTMLElement).getByText('Staff').tagName).toBe('STRONG')
      expect(filas[2]).toHaveTextContent('Staff → Usuario')
      expect(within(filas[2] as HTMLElement).getByText('Staff').tagName).toBe('STRONG')
    })

    it('una persona que ya no existe se dice así, sin inventar un nombre', async () => {
      cargarCambios.mockResolvedValue({ registros: [cambio('r-1', { administrador: null, usuarioAfectado: null })], hayMas: false })
      render(registros())

      expect(await screen.findAllByText('Persona eliminada')).toHaveLength(2)
    })
  })

  describe('accesos denegados', () => {
    it('al cambiar de pestaña muestra los accesos, con ruta, rol requerido e IP', async () => {
      render(registros())
      fireEvent.click(screen.getByRole('button', { name: 'Accesos denegados' }))

      expect(await screen.findByRole('table', { name: 'Accesos denegados, del más reciente al más antiguo' })).toBeInTheDocument()
      expect(screen.getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Fecha', 'Persona', 'Ruta', 'Rol requerido', 'IP'])
      const fila = within(screen.getAllByRole('row')[1] as HTMLElement)
      expect(fila.getByText('pedro.m')).toBeInTheDocument()
      expect(fila.getByText('GET /api/admin/staff')).toBeInTheDocument()
      expect(fila.getByText('Administración')).toBeInTheDocument()
      expect(fila.getByText('203.0.113.7')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Accesos denegados' })).toHaveAttribute('aria-pressed', 'true')
    })

    it('cambia la explicación de lo que se está viendo', async () => {
      render(registros())
      fireEvent.click(screen.getByRole('button', { name: 'Accesos denegados' }))

      expect(screen.getByText(/Intentos de entrar a rutas de staff o de administración sin permiso/)).toBeInTheDocument()
      await screen.findByRole('table')
    })

    it('si falta la persona o la IP, lo dice con texto', async () => {
      cargarAccesos.mockResolvedValue({ registros: [acceso('a-1', { usuario: null, ip: null })], hayMas: false })
      render(registros())
      fireEvent.click(screen.getByRole('button', { name: 'Accesos denegados' }))

      expect(await screen.findByText('Persona eliminada')).toBeInTheDocument()
      expect(screen.getByText('No disponible')).toBeInTheDocument()
    })
  })

  describe('paginación (la API no entrega el total)', () => {
    it('muestra qué filas se ven y pagina con "Anterior" y "Siguiente"', async () => {
      render(registros())
      await screen.findByRole('table')
      expect(screen.getByText(/Mostrando/)).toHaveTextContent('Mostrando 1–2')
      expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()

      fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))

      await waitFor(() => expect(cargarCambios).toHaveBeenLastCalledWith({ limite: 10, desplazamiento: 10 }))
      await waitFor(() => expect(screen.getByText(/Mostrando/)).toHaveTextContent('Mostrando 11–12'))
      expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled()
    })

    it('"Siguiente" se desactiva cuando la API dice que no hay más', async () => {
      cargarCambios.mockResolvedValue({ registros: [cambio('r-1')], hayMas: false })
      render(registros())
      await screen.findByRole('table')

      expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
    })
  })

  describe('cuando algo falla, carga o no hay nada', () => {
    it('mientras carga lo dice', () => {
      cargarCambios.mockReturnValue(new Promise(() => {}))
      render(registros())

      expect(screen.getByText('Cargando el registro…').tagName).toBe('OUTPUT')
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })

    it('si no se pudo cargar, avisa y permite reintentar', async () => {
      cargarCambios.mockRejectedValueOnce(new Error('caída'))
      render(registros())

      expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el registro')
      fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

      expect(await screen.findByRole('table')).toBeInTheDocument()
    })

    it('sin registros lo dice con amabilidad y no muestra una tabla vacía', async () => {
      cargarCambios.mockResolvedValue({ registros: [], hayMas: false })
      render(registros())

      expect(await screen.findByText('No hay registros todavía.')).toBeInTheDocument()
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })

    it('si cambia la versión (se ascendió o revocó a alguien), vuelve a pedir desde el principio', async () => {
      const { rerender } = render(registros(0))
      await screen.findByRole('table')

      rerender(registros(1))

      await waitFor(() => expect(cargarCambios).toHaveBeenCalledTimes(2))
      expect(cargarCambios).toHaveBeenLastCalledWith({ limite: 10, desplazamiento: 0 })
    })
  })
})
