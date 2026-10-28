import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PanelSugerencias } from './PanelSugerencias.tsx'
import type { FuenteDeSugerencias, PaginaDeSugerencias, Sugerencia } from './tipos.ts'

const sugerencia = (n: number, extra: Partial<Sugerencia> = {}): Sugerencia => ({
  id: `SUG-${1240 - n}`,
  usuario: `Trébol${n}`,
  fecha: '2026-10-16T17:00:00Z',
  texto: `Poder descargar mis entradas en PDF (${n})`,
  estado: 'pendiente',
  ...extra,
})

function fuenteFalsa(items: Sugerencia[] = [sugerencia(0), sugerencia(1)], total = 1240) {
  return {
    consultar: vi.fn<FuenteDeSugerencias['consultar']>().mockResolvedValue({ items, total }),
    resumen: vi.fn<FuenteDeSugerencias['resumen']>().mockResolvedValue({ total: 1240, pendientes: 42, enRevision: 18, implementadas: 1137, rechazadas: 43 }),
    actualizar: vi.fn<FuenteDeSugerencias['actualizar']>().mockImplementation((id, cambios) => Promise.resolve({ ...(items.find((s) => s.id === id) ?? sugerencia(0)), ...cambios })),
  }
}

const panel = (fuente: FuenteDeSugerencias, extra: Partial<Parameters<typeof PanelSugerencias>[0]> = {}) => (
  <PanelSugerencias fuente={fuente} apodo="Ani" onSalir={() => {}} retardoBusquedaMs={0} {...extra} />
)

describe('PanelSugerencias', () => {
  let fuente: ReturnType<typeof fuenteFalsa>

  beforeEach(() => {
    fuente = fuenteFalsa()
  })

  describe('lo que muestra', () => {
    it('el resumen con las cifras que entrega el backend', async () => {
      render(panel(fuente))

      const resumen = within(screen.getByRole('region', { name: 'Resumen de sugerencias' }))
      expect(await resumen.findByText('1.240')).toBeInTheDocument()
      expect(resumen.getByText('42')).toBeInTheDocument()
      expect(resumen.getByText('18')).toBeInTheDocument()
      expect(resumen.getByText('1.137')).toBeInTheDocument()
      expect(resumen.getByText('92% del total')).toBeInTheDocument()
    })

    it('mientras no tiene cifras muestra guiones, no números inventados', () => {
      fuente.resumen.mockReturnValue(new Promise(() => {}))
      render(panel(fuente))

      expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4)
    })

    it('cada sugerencia con su ID, usuario, fecha, texto y estado', async () => {
      render(panel(fuente))

      const fila = within((await screen.findByText('Trébol0')).closest('tr') as HTMLElement)
      expect(fila.getByText('#SUG-1240')).toBeInTheDocument()
      expect(fila.getByText('16 oct 2026')).toBeInTheDocument()
      expect(fila.getByText(/Poder descargar mis entradas en PDF \(0\)/)).toBeInTheDocument()
      expect(fila.getByText('Pendiente', { selector: 'span' })).toBeInTheDocument()
    })

    it('cuántas hay en total y cuáles se están viendo', async () => {
      render(panel(fuente))

      expect(await screen.findByText(/Mostrando/)).toHaveTextContent('Mostrando 1–10 de 1.240 sugerencias')
    })

    it('si no hay resultados lo dice con amabilidad', async () => {
      render(panel(fuenteFalsa([], 0)))

      expect(await screen.findByText('No hay sugerencias con estos filtros.')).toBeInTheDocument()
      expect(screen.getByText(/Mostrando/)).toHaveTextContent('Mostrando 0–0 de 0 sugerencias')
    })

    it('una tabla accesible: con título y seis columnas con encabezado', async () => {
      render(panel(fuente))
      await screen.findByText('Trébol0')

      expect(screen.getByRole('table', { name: 'Bandeja de sugerencias' })).toBeInTheDocument()
      expect(screen.getAllByRole('columnheader')).toHaveLength(6)
    })

    it('el encabezado dice quién tiene la sesión y permite cerrarla', async () => {
      const onSalir = vi.fn<() => void>()
      render(panel(fuente, { onSalir }))
      await screen.findByText('Trébol0')

      expect(screen.getByText('Staff:')).toHaveTextContent('Staff: Ani')
      fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

      expect(onSalir).toHaveBeenCalledOnce()
    })

    it('el botón de administración solo aparece si se entrega (solo administradores)', async () => {
      const { unmount } = render(panel(fuente))
      await screen.findByText('Trébol0')
      expect(screen.queryByRole('button', { name: 'Panel de Administración' })).not.toBeInTheDocument()
      unmount()

      const onAdministracion = vi.fn<() => void>()
      render(panel(fuenteFalsa(), { onAdministracion }))
      fireEvent.click(await screen.findByRole('button', { name: 'Panel de Administración' }))

      expect(onAdministracion).toHaveBeenCalledOnce()
    })
  })

  describe('filtros, orden y paginación: los resuelve el servidor', () => {
    it('la primera consulta pide la página 1, de 10, las más recientes, sin filtros', async () => {
      render(panel(fuente))
      await screen.findByText('Trébol0')

      expect(fuente.consultar).toHaveBeenCalledWith({ busqueda: '', estado: 'todos', orden: 'recientes', pagina: 1, tamano: 10 })
    })

    it('filtra por estado', async () => {
      render(panel(fuente))
      await screen.findByText('Trébol0')

      fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'en-revision' } })

      await waitFor(() => expect(fuente.consultar).toHaveBeenLastCalledWith(expect.objectContaining({ estado: 'en-revision', pagina: 1 })))
    })

    it('busca por usuario o contenido', async () => {
      render(panel(fuente))
      await screen.findByText('Trébol0')

      fireEvent.change(screen.getByLabelText('Buscar por usuario o contenido'), { target: { value: '  trébol  ' } })

      await waitFor(() => expect(fuente.consultar).toHaveBeenLastCalledWith(expect.objectContaining({ busqueda: 'trébol' })))
    })

    it('filtra por fecha, desde y hasta', async () => {
      render(panel(fuente))
      await screen.findByText('Trébol0')

      fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-10-01' } })
      fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-10-15' } })

      await waitFor(() => expect(fuente.consultar).toHaveBeenLastCalledWith(expect.objectContaining({ desde: '2026-10-01', hasta: '2026-10-15' })))
    })

    it('ordena por las más antiguas', async () => {
      render(panel(fuente))
      await screen.findByText('Trébol0')

      fireEvent.change(screen.getByLabelText('Orden'), { target: { value: 'antiguas' } })

      await waitFor(() => expect(fuente.consultar).toHaveBeenLastCalledWith(expect.objectContaining({ orden: 'antiguas' })))
    })

    it('cambia de página y vuelve a la primera al filtrar', async () => {
      render(panel(fuente))
      await screen.findByText('Trébol0')
      expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled()

      fireEvent.click(screen.getByRole('button', { name: 'Página 2' }))
      await waitFor(() => expect(fuente.consultar).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 2 })))
      fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'pendiente' } })

      await waitFor(() => expect(fuente.consultar).toHaveBeenLastCalledWith(expect.objectContaining({ estado: 'pendiente', pagina: 1 })))
    })

    it('muestra la paginación con la primera, la última y un hueco', async () => {
      render(panel(fuente))
      await screen.findByText('Trébol0')

      const paginas = within(screen.getByRole('navigation', { name: 'Paginación' }))
      expect(paginas.getByRole('button', { name: 'Página 1' })).toHaveAttribute('aria-current', 'page')
      expect(paginas.getByRole('button', { name: 'Página 124' })).toBeInTheDocument()
    })

    it('una respuesta lenta de una consulta vieja no pisa a la más reciente', async () => {
      let responderLaVieja: (pagina: PaginaDeSugerencias) => void = () => {}
      fuente.consultar.mockReturnValueOnce(new Promise((resolver) => (responderLaVieja = resolver)))
      render(panel(fuente))
      fuente.consultar.mockResolvedValue({ items: [sugerencia(7, { estado: 'rechazada' })], total: 1 })

      fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'rechazada' } })
      await screen.findByText('Trébol7')
      responderLaVieja({ items: [sugerencia(0)], total: 1240 })
      await new Promise((resolver) => setTimeout(resolver, 20))

      expect(screen.getByText('Trébol7')).toBeInTheDocument()
      expect(screen.queryByText('Trébol0')).not.toBeInTheDocument()
    })
  })

  describe('gestionar una sugerencia (HU-11)', () => {
    it('cambiar el estado desde la fila lo guarda, vuelve a pedir los datos y lo cuenta con texto', async () => {
      render(panel(fuente))
      await screen.findByText('Trébol0')

      fireEvent.change(screen.getByLabelText('Estado de la sugerencia SUG-1240'), { target: { value: 'en-revision' } })

      await waitFor(() => expect(fuente.actualizar).toHaveBeenCalledWith('SUG-1240', { estado: 'en-revision' }))
      expect(await screen.findByText('La sugerencia SUG-1240 ahora está en revisión.')).toBeInTheDocument()
      await waitFor(() => expect(fuente.resumen).toHaveBeenCalledTimes(2))
      expect(fuente.consultar).toHaveBeenCalledTimes(2)
    })

    it('si no se puede cambiar el estado, avisa con amabilidad', async () => {
      fuente.actualizar.mockRejectedValue(new Error('caída'))
      render(panel(fuente))
      await screen.findByText('Trébol0')

      fireEvent.change(screen.getByLabelText('Estado de la sugerencia SUG-1240'), { target: { value: 'rechazada' } })

      expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cambiar el estado')
    })

    it('el ojo abre la sugerencia completa, sin guardar nada hasta que haya cambios', async () => {
      render(panel(fuente))
      await screen.findByText('Trébol0')

      fireEvent.click(screen.getByRole('button', { name: 'Ver la sugerencia SUG-1240' }))

      const dialogo = within(screen.getByRole('dialog', { name: 'Sugerencia #SUG-1240' }))
      expect(screen.getByRole('dialog')).toHaveAccessibleDescription('De Trébol0 · 16 oct 2026')
      expect(dialogo.getByText('Poder descargar mis entradas en PDF (0)', { selector: 'blockquote' })).toBeInTheDocument()
      expect(dialogo.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
    })

    it('guarda el estado y un comentario que verá quien sugirió', async () => {
      render(panel(fuente))
      await screen.findByText('Trébol0')
      fireEvent.click(screen.getByRole('button', { name: 'Ver la sugerencia SUG-1240' }))

      const dialogo = within(screen.getByRole('dialog'))
      fireEvent.change(dialogo.getByLabelText('Estado'), { target: { value: 'implementada' } })
      fireEvent.change(dialogo.getByLabelText('Comentario para quien sugirió'), { target: { value: '  ¡Ya está disponible!  ' } })
      expect(dialogo.getByText('La persona verá este comentario.')).toBeInTheDocument()
      fireEvent.click(dialogo.getByRole('button', { name: 'Guardar cambios' }))

      await waitFor(() => expect(fuente.actualizar).toHaveBeenCalledWith('SUG-1240', { estado: 'implementada', comentario: '¡Ya está disponible!' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(screen.getByText('Guardamos los cambios de la sugerencia SUG-1240.')).toBeInTheDocument()
    })

    it('si solo se escribe un comentario, solo se envía el comentario', async () => {
      render(panel(fuente))
      await screen.findByText('Trébol0')
      fireEvent.click(screen.getByRole('button', { name: 'Ver la sugerencia SUG-1240' }))

      fireEvent.change(within(screen.getByRole('dialog')).getByLabelText('Comentario para quien sugirió'), { target: { value: 'Lo estamos revisando' } })
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar cambios' }))

      await waitFor(() => expect(fuente.actualizar).toHaveBeenCalledWith('SUG-1240', { comentario: 'Lo estamos revisando' }))
    })

    it('si no se pueden guardar los cambios, la ventana sigue abierta con un aviso amable', async () => {
      fuente.actualizar.mockRejectedValue(new Error('caída'))
      render(panel(fuente))
      await screen.findByText('Trébol0')
      fireEvent.click(screen.getByRole('button', { name: 'Ver la sugerencia SUG-1240' }))

      fireEvent.change(within(screen.getByRole('dialog')).getByLabelText('Estado'), { target: { value: 'rechazada' } })
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar cambios' }))

      expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('No pudimos guardar los cambios')
    })

    it('se puede cerrar la ventana sin guardar', async () => {
      render(panel(fuente))
      await screen.findByText('Trébol0')
      fireEvent.click(screen.getByRole('button', { name: 'Ver la sugerencia SUG-1240' }))

      fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(fuente.actualizar).not.toHaveBeenCalled()
    })
  })

  describe('cuando algo falla', () => {
    it('si no se pueden cargar las sugerencias, avisa y permite reintentar', async () => {
      fuente.consultar.mockRejectedValueOnce(new Error('caída'))
      render(panel(fuente))

      expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar las sugerencias')
      fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

      expect(await screen.findByText('Trébol0')).toBeInTheDocument()
      expect(screen.queryByText(/No pudimos cargar/)).not.toBeInTheDocument()
    })
  })
})
