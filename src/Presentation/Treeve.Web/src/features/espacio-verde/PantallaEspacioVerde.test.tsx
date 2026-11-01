import { fireEvent, render, screen } from '@testing-library/react'
import { createRef, useImperativeHandle, type Ref } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ControlEspacioVerde } from '../../scene/EspacioVerde.tsx'
import { loteDePrueba } from '../../test/loteDePrueba.ts'
import { PantallaEspacioVerde } from './PantallaEspacioVerde.tsx'

const control = vi.hoisted(() => ({ regar: vi.fn<() => void>(), crecer: vi.fn<() => void>() }))

vi.mock('../../scene/EspacioVerde.tsx', () => ({
  EspacioVerde: ({ etapa, nivelFlores, nivelBosque, ref }: { etapa: string; nivelFlores?: number; nivelBosque?: number; ref?: Ref<ControlEspacioVerde> }) => {
    useImperativeHandle(ref, () => control, [])
    return <p>{`escena ${etapa} flores ${nivelFlores} bosque ${nivelBosque}`}</p>
  },
}))

const pantalla = (extra: Partial<Parameters<typeof PantallaEspacioVerde>[0]> = {}) => (
  <PantallaEspacioVerde
    apodo="Luis"
    lote={loteDePrueba()}
    cargandoLote={false}
    falloLote={false}
    onReintentarLote={() => {}}
    controlesSonido={<p>controles de sonido</p>}
    onDesahogarme={() => {}}
    onSugerir={() => {}}
    onSalir={() => {}}
    {...extra}
  />
)

describe('PantallaEspacioVerde', () => {
  beforeEach(() => {
    control.regar.mockClear()
    control.crecer.mockClear()
  })

  it('saluda por el apodo con un único título principal', () => {
    render(pantalla())

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Hola, Luis' })).toBeInTheDocument()
  })

  describe('el lote (HU-07a)', () => {
    it('dibuja la etapa del árbol y los niveles de flores y bosque que entrega la API', () => {
      render(pantalla({ lote: loteDePrueba({ etapa: 'flor', niveles: { arbol: 3, flores: 4, bosque: 2 } }) }))

      expect(screen.getByText('escena flor flores 4 bosque 2')).toBeInTheDocument()
    })

    it('muestra el estado del lote y el progreso hacia el siguiente crecimiento', () => {
      render(pantalla())

      expect(screen.getByRole('region', { name: 'Estado de tu espacio verde' })).toBeInTheDocument()
      expect(screen.getByText('Te faltan 2 desahogos para que crezca el bosque.')).toBeInTheDocument()
    })

    it('mientras no hay lote no dibuja la escena: un lote de mentira confundiría a quien ya lo tiene crecido', () => {
      render(pantalla({ lote: null, cargandoLote: true }))

      expect(screen.queryByText(/^escena/)).not.toBeInTheDocument()
      expect(screen.getByText('Cargando tu espacio verde…')).toBeInTheDocument()
    })

    it('sin lote tampoco muestra niveles ni cifras', () => {
      const { container } = render(pantalla({ lote: null, cargandoLote: true }))

      expect(container.textContent).not.toMatch(/Nivel \d|desahogos|Tallo|Brote/)
    })

    it('si no se pudo leer, avisa y permite reintentar', () => {
      const onReintentarLote = vi.fn<() => void>()
      render(pantalla({ lote: null, falloLote: true, onReintentarLote }))

      expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar tu espacio verde')
      fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

      expect(onReintentarLote).toHaveBeenCalledOnce()
    })

    it('se puede desahogar aunque el lote todavía no haya llegado', () => {
      const onDesahogarme = vi.fn<() => void>()
      render(pantalla({ lote: null, cargandoLote: true, onDesahogarme }))

      fireEvent.click(screen.getByRole('button', { name: 'Desahogarme ahora' }))

      expect(onDesahogarme).toHaveBeenCalledOnce()
    })
  })

  it('muestra los controles de sonido', () => {
    render(pantalla())

    expect(screen.getByText('controles de sonido')).toBeInTheDocument()
  })

  it('"Desahogarme ahora" abre el camino para desahogarse', () => {
    const onDesahogarme = vi.fn<() => void>()
    render(pantalla({ onDesahogarme }))

    fireEvent.click(screen.getByRole('button', { name: 'Desahogarme ahora' }))

    expect(onDesahogarme).toHaveBeenCalledOnce()
  })

  it('el menú inferior también lleva a desahogarse y marca la sección actual', () => {
    const onDesahogarme = vi.fn<() => void>()
    render(pantalla({ onDesahogarme }))
    const menu = screen.getByRole('navigation', { name: 'Secciones' })

    expect(menu).toHaveTextContent('Mi espacio verde')
    expect(screen.getByRole('button', { name: 'Mi espacio verde' })).toHaveAttribute('aria-current', 'page')
    fireEvent.click(screen.getByRole('button', { name: 'Desahogarme' }))

    expect(onDesahogarme).toHaveBeenCalledOnce()
  })

  it('la tarjeta de sugerencias y el menú abren las sugerencias', () => {
    const onSugerir = vi.fn<() => void>()
    render(pantalla({ onSugerir }))

    fireEvent.click(screen.getByRole('button', { name: 'Enviar una sugerencia' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sugerencias' }))

    expect(screen.getByRole('heading', { level: 2, name: 'Sugerencias' })).toBeInTheDocument()
    expect(onSugerir).toHaveBeenCalledTimes(2)
  })

  it('permite salir', () => {
    const onSalir = vi.fn<() => void>()
    render(pantalla({ onSalir }))

    fireEvent.click(screen.getByRole('button', { name: 'Salir' }))

    expect(onSalir).toHaveBeenCalledOnce()
  })

  it('cuenta con texto lo que ocurre en la escena', () => {
    render(pantalla({ aviso: 'Tu desahogo regó tu espacio verde.' }))

    expect(screen.getByText('Tu desahogo regó tu espacio verde.').tagName).toBe('OUTPUT')
  })

  it('deja regar y hacer crecer la escena desde fuera', () => {
    const ref = createRef<ControlEspacioVerde>()
    render(pantalla({ ref }))

    ref.current?.regar()
    ref.current?.crecer()

    expect(control.regar).toHaveBeenCalledOnce()
    expect(control.crecer).toHaveBeenCalledOnce()
  })

  it('no inventa datos que la API no entrega: nada de días, rachas ni historial', () => {
    const { container } = render(pantalla())

    expect(container.textContent).not.toMatch(/racha|día \d|historial|nutrientes|\d+ desahogos escritos/i)
  })

  describe('la campana de avisos', () => {
    it('muestra el control de avisos que entrega app/, junto a los de sonido', () => {
      render(pantalla({ controlDeAvisos: <button type="button">campana</button> }))

      expect(screen.getByRole('button', { name: 'campana' })).toBeInTheDocument()
    })

    it('sin control de avisos, el encabezado queda como antes', () => {
      render(pantalla())

      expect(screen.queryByRole('button', { name: /campana|Avisos/ })).not.toBeInTheDocument()
    })
  })
})
