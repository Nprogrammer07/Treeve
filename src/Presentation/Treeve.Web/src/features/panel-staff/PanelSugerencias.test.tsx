import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PanelSugerencias } from './PanelSugerencias.tsx'
import type { FuenteDeSugerencias, PaginaDeSugerencias, Sugerencia } from './tipos.ts'

const sugerencia = (n: number, extra: Partial<Sugerencia> = {}): Sugerencia => ({
  id: `SUG-${1240 - n}`,
  usuario: `trebol${n}`,
  fecha: '2026-10-16T17:00:00Z',
  texto: `Poder descargar mis entradas en PDF (${n})`,
  estado: 'pendiente',
  ...extra,
})

const diez = Array.from({ length: 10 }, (_, i) => sugerencia(i))

/** Una fuente que solo consulta: sin resumen con cifras y sin cambio de estado. */
function fuenteDeSoloLectura(items: Sugerencia[] = diez, hayMas = true) {
  return { consultar: vi.fn<FuenteDeSugerencias['consultar']>().mockResolvedValue({ items, hayMas }) }
}

/** Como la fuente de muestra de desarrollo: además resume y permite cambiar el estado y comentar (HU-11). */
function fuenteCompleta(items: Sugerencia[] = diez, hayMas = true) {
  return {
    ...fuenteDeSoloLectura(items, hayMas),
    resumen: vi.fn<NonNullable<FuenteDeSugerencias['resumen']>>().mockResolvedValue({ total: 1240, pendientes: 42, enRevision: 18, implementadas: 1137, rechazadas: 43 }),
    actualizar: vi.fn<NonNullable<FuenteDeSugerencias['actualizar']>>().mockResolvedValue({ huboCambios: true }),
  }
}

const panel = (fuente: FuenteDeSugerencias, extra: Partial<Parameters<typeof PanelSugerencias>[0]> = {}) => <PanelSugerencias fuente={fuente} apodo="Ani" onSalir={() => {}} {...extra} />

describe('PanelSugerencias cuando la fuente solo consulta (no permite cambiar el estado)', () => {
  describe('lo que muestra', () => {
    it('cada sugerencia con su ID corto, usuario, fecha, texto y estado', async () => {
      render(panel(fuenteDeSoloLectura()))

      const fila = within((await screen.findByText('trebol0')).closest('tr') as HTMLElement)
      expect(fila.getByText('#SUG-1240')).toBeInTheDocument()
      expect(fila.getByText('16 oct 2026')).toBeInTheDocument()
      expect(fila.getByText(/Poder descargar mis entradas en PDF \(0\)/)).toBeInTheDocument()
      expect(fila.getByText('Pendiente')).toBeInTheDocument()
    })

    it('el ID de la API (un identificador largo) se acorta en la tabla', async () => {
      render(panel(fuenteDeSoloLectura([sugerencia(0, { id: '3f2504e0-4f89-11d3-9a0c-0305e82c3301' })])))

      expect(await screen.findByText('#3f2504e0')).toBeInTheDocument()
    })

    it('no muestra cifras de resumen: la API todavía no las entrega, así que no se inventan', async () => {
      render(panel(fuenteDeSoloLectura()))
      await screen.findByText('trebol0')

      expect(screen.queryByRole('region', { name: 'Resumen de sugerencias' })).not.toBeInTheDocument()
    })

    it('el estado se puede ver pero no cambiar: no hay selector en las filas', async () => {
      render(panel(fuenteDeSoloLectura()))
      await screen.findByText('trebol0')

      expect(screen.queryByLabelText(/Estado de la sugerencia/)).not.toBeInTheDocument()
    })

    it('el ojo abre la sugerencia completa, de solo lectura y avisando que cambiarla llegará pronto', async () => {
      render(panel(fuenteDeSoloLectura()))
      await screen.findByText('trebol0')

      fireEvent.click(screen.getByRole('button', { name: 'Ver la sugerencia SUG-1240' }))

      const dialogo = screen.getByRole('dialog', { name: 'Sugerencia #SUG-1240' })
      expect(dialogo).toHaveAccessibleDescription('De trebol0 · 16 oct 2026')
      expect(within(dialogo).getByText('Poder descargar mis entradas en PDF (0)', { selector: 'blockquote' })).toBeInTheDocument()
      expect(within(dialogo).getByText(/Por ahora solo se pueden consultar/)).toBeInTheDocument()
      expect(within(dialogo).queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument()
    })

    it('si no hay resultados lo dice con amabilidad', async () => {
      render(panel(fuenteDeSoloLectura([], false)))

      expect(await screen.findByText('No hay sugerencias con estos filtros.')).toBeInTheDocument()
      expect(screen.getByText('No hay sugerencias en esta página')).toBeInTheDocument()
    })

    it('una tabla accesible: con título y seis columnas con encabezado', async () => {
      render(panel(fuenteDeSoloLectura()))
      await screen.findByText('trebol0')

      expect(screen.getByRole('table', { name: 'Bandeja de sugerencias' })).toBeInTheDocument()
      expect(screen.getAllByRole('columnheader')).toHaveLength(6)
    })

    it('el encabezado dice quién tiene la sesión y permite cerrarla', async () => {
      const onSalir = vi.fn<() => void>()
      render(panel(fuenteDeSoloLectura(), { onSalir }))
      await screen.findByText('trebol0')

      expect(screen.getByText('Staff:')).toHaveTextContent('Staff: Ani')
      fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

      expect(onSalir).toHaveBeenCalledOnce()
    })

    it('el botón de administración solo aparece si se entrega (solo administradores)', async () => {
      const { unmount } = render(panel(fuenteDeSoloLectura()))
      await screen.findByText('trebol0')
      expect(screen.queryByRole('button', { name: 'Panel de Administración' })).not.toBeInTheDocument()
      unmount()

      const onAdministracion = vi.fn<() => void>()
      render(panel(fuenteDeSoloLectura(), { onAdministracion }))
      fireEvent.click(await screen.findByRole('button', { name: 'Panel de Administración' }))

      expect(onAdministracion).toHaveBeenCalledOnce()
    })
  })

  describe('filtros y paginación: los resuelve el servidor', () => {
    it('la primera consulta pide 10 filas desde el principio, sin filtros', async () => {
      const fuente = fuenteDeSoloLectura()
      render(panel(fuente))
      await screen.findByText('trebol0')

      expect(fuente.consultar).toHaveBeenCalledWith({ orden: 'recientes', limite: 10, desplazamiento: 0 })
    })

    it('filtra por estado (con el valor que escribe la API) y vuelve a empezar', async () => {
      const fuente = fuenteDeSoloLectura()
      render(panel(fuente))
      await screen.findByText('trebol0')

      fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'en_revision' } })

      await waitFor(() => expect(fuente.consultar).toHaveBeenLastCalledWith(expect.objectContaining({ estado: 'en_revision', desplazamiento: 0 })))
    })

    it('"Todos los estados" quita el filtro', async () => {
      const fuente = fuenteDeSoloLectura()
      render(panel(fuente))
      await screen.findByText('trebol0')
      fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'rechazada' } })
      await waitFor(() => expect(fuente.consultar).toHaveBeenLastCalledWith(expect.objectContaining({ estado: 'rechazada' })))

      fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'todos' } })

      await waitFor(() => expect(fuente.consultar).toHaveBeenLastCalledWith({ orden: 'recientes', limite: 10, desplazamiento: 0, estado: undefined }))
    })

    it('busca por nombre de usuario exacto al pulsar "Buscar" y se quita dejándolo vacío', async () => {
      const fuente = fuenteDeSoloLectura()
      render(panel(fuente))
      await screen.findByText('trebol0')

      fireEvent.change(screen.getByLabelText('Buscar por nombre de usuario'), { target: { value: '  ana.l  ' } })
      fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
      await waitFor(() => expect(fuente.consultar).toHaveBeenLastCalledWith(expect.objectContaining({ usuario: 'ana.l', desplazamiento: 0 })))

      fireEvent.change(screen.getByLabelText('Buscar por nombre de usuario'), { target: { value: '' } })
      fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
      await waitFor(() => expect(fuente.consultar).toHaveBeenLastCalledWith(expect.objectContaining({ usuario: undefined })))
    })

    it('mientras se escribe el usuario no se consulta: solo al buscar', async () => {
      const fuente = fuenteDeSoloLectura()
      render(panel(fuente))
      await screen.findByText('trebol0')
      const consultas = fuente.consultar.mock.calls.length

      fireEvent.change(screen.getByLabelText('Buscar por nombre de usuario'), { target: { value: 'ana' } })
      await new Promise((resolver) => setTimeout(resolver, 30))

      expect(fuente.consultar.mock.calls.length).toBe(consultas)
    })

    it('filtra por fecha, desde y hasta', async () => {
      const fuente = fuenteDeSoloLectura()
      render(panel(fuente))
      await screen.findByText('trebol0')

      fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-10-01' } })
      fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-10-15' } })

      await waitFor(() => expect(fuente.consultar).toHaveBeenLastCalledWith(expect.objectContaining({ desde: '2026-10-01', hasta: '2026-10-15' })))
    })

    it('no ofrece buscar por contenido: la API solo filtra por nombre de usuario exacto', async () => {
      render(panel(fuenteDeSoloLectura()))
      await screen.findByText('trebol0')

      expect(screen.queryByPlaceholderText(/contenido/i)).not.toBeInTheDocument()
    })

    it('ofrece los tres órdenes de la API: recientes, antiguas y por usuario', async () => {
      render(panel(fuenteDeSoloLectura()))
      await screen.findByText('trebol0')

      const opciones = within(screen.getByLabelText('Orden')).getAllByRole('option').map((o) => o.textContent)

      expect(opciones).toEqual(['Más recientes primero', 'Más antiguas primero', 'Por usuario (A a Z)'])
    })

    it.each([['antiguas'], ['usuario']])('ordenar por "%s" vuelve a pedir desde el principio con ese orden', async (orden) => {
      const fuente = fuenteDeSoloLectura()
      render(panel(fuente))
      await screen.findByText('trebol0')
      fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
      await waitFor(() => expect(fuente.consultar).toHaveBeenLastCalledWith(expect.objectContaining({ desplazamiento: 10 })))

      fireEvent.change(screen.getByLabelText('Orden'), { target: { value: orden } })

      await waitFor(() => expect(fuente.consultar).toHaveBeenLastCalledWith(expect.objectContaining({ orden, desplazamiento: 0 })))
    })

    it('pagina con "Siguiente" y "Anterior", sin números de página ni total: la API no entrega el total', async () => {
      const fuente = fuenteDeSoloLectura()
      render(panel(fuente))
      await screen.findByText('trebol0')
      expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
      expect(screen.getByText(/Mostrando/)).toHaveTextContent('Mostrando 1–10')

      fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
      await waitFor(() => expect(fuente.consultar).toHaveBeenLastCalledWith(expect.objectContaining({ desplazamiento: 10 })))
      await waitFor(() => expect(screen.getByText(/Mostrando/)).toHaveTextContent('Mostrando 11–20'))
      fireEvent.click(screen.getByRole('button', { name: 'Anterior' }))

      await waitFor(() => expect(fuente.consultar).toHaveBeenLastCalledWith(expect.objectContaining({ desplazamiento: 0 })))
      expect(screen.queryByRole('button', { name: 'Página 2' })).not.toBeInTheDocument()
    })

    it('"Siguiente" se desactiva cuando la API dice que no hay más páginas', async () => {
      render(panel(fuenteDeSoloLectura(diez, false)))
      await screen.findByText('trebol0')

      expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
    })

    it('al filtrar vuelve a la primera página', async () => {
      const fuente = fuenteDeSoloLectura()
      render(panel(fuente))
      await screen.findByText('trebol0')
      fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
      await waitFor(() => expect(fuente.consultar).toHaveBeenLastCalledWith(expect.objectContaining({ desplazamiento: 10 })))

      fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'pendiente' } })

      await waitFor(() => expect(fuente.consultar).toHaveBeenLastCalledWith(expect.objectContaining({ estado: 'pendiente', desplazamiento: 0 })))
    })

    it('una respuesta lenta de una consulta vieja no pisa a la más reciente', async () => {
      const fuente = fuenteDeSoloLectura()
      let responderLaVieja: (pagina: PaginaDeSugerencias) => void = () => {}
      fuente.consultar.mockReturnValueOnce(new Promise((resolver) => (responderLaVieja = resolver)))
      render(panel(fuente))
      fuente.consultar.mockResolvedValue({ items: [sugerencia(7, { estado: 'rechazada' })], hayMas: false })

      fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'rechazada' } })
      await screen.findByText('trebol7')
      responderLaVieja({ items: [sugerencia(0)], hayMas: true })
      await new Promise((resolver) => setTimeout(resolver, 20))

      expect(screen.getByText('trebol7')).toBeInTheDocument()
      expect(screen.queryByText('trebol0')).not.toBeInTheDocument()
    })
  })

  describe('cuando algo falla', () => {
    it('si no se pueden cargar las sugerencias, avisa y permite reintentar', async () => {
      const fuente = fuenteDeSoloLectura()
      fuente.consultar.mockRejectedValueOnce(new Error('caída'))
      render(panel(fuente))

      expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar las sugerencias')
      fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

      expect(await screen.findByText('trebol0')).toBeInTheDocument()
      expect(screen.queryByText(/No pudimos cargar/)).not.toBeInTheDocument()
    })
  })
})

describe('PanelSugerencias cuando la fuente también resume y permite cambiar el estado (HU-11)', () => {
  it('muestra el resumen con las cifras que entrega la fuente', async () => {
    render(panel(fuenteCompleta()))

    const resumen = within(await screen.findByRole('region', { name: 'Resumen de sugerencias' }))
    expect(await resumen.findByText('1.240')).toBeInTheDocument()
    expect(resumen.getByText('42')).toBeInTheDocument()
    expect(resumen.getByText('92% del total')).toBeInTheDocument()
  })

  it('cambiar el estado desde la fila lo guarda, vuelve a pedir los datos y lo cuenta con texto', async () => {
    const fuente = fuenteCompleta()
    render(panel(fuente))
    await screen.findByText('trebol0')

    fireEvent.change(screen.getByLabelText('Estado de la sugerencia SUG-1240'), { target: { value: 'en_revision' } })

    await waitFor(() => expect(fuente.actualizar).toHaveBeenCalledWith('SUG-1240', { estado: 'en_revision' }))
    expect(await screen.findByText('La sugerencia SUG-1240 ahora está en revisión.')).toBeInTheDocument()
    await waitFor(() => expect(fuente.resumen).toHaveBeenCalledTimes(2))
    expect(fuente.consultar).toHaveBeenCalledTimes(2)
  })

  it('si no se puede cambiar el estado, avisa con amabilidad', async () => {
    const fuente = fuenteCompleta()
    fuente.actualizar.mockRejectedValue(new Error('caída'))
    render(panel(fuente))
    await screen.findByText('trebol0')

    fireEvent.change(screen.getByLabelText('Estado de la sugerencia SUG-1240'), { target: { value: 'rechazada' } })

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cambiar el estado')
  })

  it('el ojo permite cambiar el estado y dejar un comentario que verá quien sugirió', async () => {
    const fuente = fuenteCompleta()
    render(panel(fuente))
    await screen.findByText('trebol0')
    fireEvent.click(screen.getByRole('button', { name: 'Ver la sugerencia SUG-1240' }))

    const dialogo = within(screen.getByRole('dialog'))
    expect(dialogo.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
    fireEvent.change(dialogo.getByLabelText('Estado'), { target: { value: 'implementada' } })
    fireEvent.change(dialogo.getByLabelText('Comentario para quien sugirió'), { target: { value: '  ¡Ya está disponible!  ' } })
    expect(dialogo.getByText(/La persona verá este comentario\./)).toBeInTheDocument()
    fireEvent.click(dialogo.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(fuente.actualizar).toHaveBeenCalledWith('SUG-1240', { estado: 'implementada', comentario: '¡Ya está disponible!' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('si solo se escribe un comentario, solo se envía el comentario', async () => {
    const fuente = fuenteCompleta()
    render(panel(fuente))
    await screen.findByText('trebol0')
    fireEvent.click(screen.getByRole('button', { name: 'Ver la sugerencia SUG-1240' }))

    fireEvent.change(within(screen.getByRole('dialog')).getByLabelText('Comentario para quien sugirió'), { target: { value: 'Lo estamos revisando' } })
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(fuente.actualizar).toHaveBeenCalledWith('SUG-1240', { comentario: 'Lo estamos revisando' }))
  })

  it('si no se pueden guardar los cambios, la ventana sigue abierta con un aviso amable', async () => {
    const fuente = fuenteCompleta()
    fuente.actualizar.mockRejectedValue(new Error('caída'))
    render(panel(fuente))
    await screen.findByText('trebol0')
    fireEvent.click(screen.getByRole('button', { name: 'Ver la sugerencia SUG-1240' }))

    fireEvent.change(within(screen.getByRole('dialog')).getByLabelText('Estado'), { target: { value: 'rechazada' } })
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar cambios' }))

    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('No pudimos guardar los cambios')
  })

  it('se puede cerrar la ventana sin guardar', async () => {
    const fuente = fuenteCompleta()
    render(panel(fuente))
    await screen.findByText('trebol0')
    fireEvent.click(screen.getByRole('button', { name: 'Ver la sugerencia SUG-1240' }))

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(fuente.actualizar).not.toHaveBeenCalled()
  })

  it('si el servidor dice que no hubo cambios (se envió lo mismo), lo cuenta y no finge que guardó algo', async () => {
    const fuente = fuenteCompleta()
    fuente.actualizar.mockResolvedValue({ huboCambios: false })
    render(panel(fuente))
    await screen.findByText('trebol0')

    fireEvent.change(screen.getByLabelText('Estado de la sugerencia SUG-1240'), { target: { value: 'pendiente' } })

    expect(await screen.findByText('La sugerencia SUG-1240 ya estaba pendiente: no se guardó nada.')).toBeInTheDocument()
  })

  it('al guardar el detalle sin que el servidor registre cambios, lo dice', async () => {
    const fuente = fuenteCompleta()
    fuente.actualizar.mockResolvedValue({ huboCambios: false })
    render(panel(fuente))
    await screen.findByText('trebol0')
    fireEvent.click(screen.getByRole('button', { name: 'Ver la sugerencia SUG-1240' }))

    fireEvent.change(within(screen.getByRole('dialog')).getByLabelText('Comentario para quien sugirió'), { target: { value: 'Lo vemos' } })
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('No había nada nuevo que guardar en la sugerencia SUG-1240.')).toBeInTheDocument()
  })

  it('el detalle muestra el comentario y la fecha de la última gestión que ya tiene la sugerencia', async () => {
    const fuente = fuenteCompleta([sugerencia(0, { comentario: 'Lo vamos a evaluar.', gestionadaEn: '2026-10-30T15:00:00Z' }), ...diez.slice(1)])
    render(panel(fuente))
    await screen.findByText('trebol0')

    fireEvent.click(screen.getByRole('button', { name: 'Ver la sugerencia SUG-1240' }))

    const dialogo = within(screen.getByRole('dialog'))
    expect(dialogo.getByLabelText('Comentario para quien sugirió')).toHaveValue('Lo vamos a evaluar.')
    expect(dialogo.getByText('Última gestión: 30 oct 2026')).toBeInTheDocument()
  })

  it('el comentario admite hasta 500 caracteres y muestra cuántos lleva', async () => {
    render(panel(fuenteCompleta()))
    await screen.findByText('trebol0')
    fireEvent.click(screen.getByRole('button', { name: 'Ver la sugerencia SUG-1240' }))
    const campo = within(screen.getByRole('dialog')).getByLabelText('Comentario para quien sugirió')

    fireEvent.change(campo, { target: { value: 'Lo vemos' } })

    expect(campo).toHaveAttribute('maxLength', '500')
    expect(campo).toHaveAccessibleDescription('La persona verá este comentario. 8 / 500')
  })

  it('quitar el comentario existente envía un comentario vacío, que es como la API lo borra', async () => {
    const fuente = fuenteCompleta([sugerencia(0, { comentario: 'Lo vamos a evaluar.' }), ...diez.slice(1)])
    render(panel(fuente))
    await screen.findByText('trebol0')
    fireEvent.click(screen.getByRole('button', { name: 'Ver la sugerencia SUG-1240' }))

    fireEvent.change(within(screen.getByRole('dialog')).getByLabelText('Comentario para quien sugirió'), { target: { value: '   ' } })
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(fuente.actualizar).toHaveBeenCalledWith('SUG-1240', { comentario: '' }))
  })
})
