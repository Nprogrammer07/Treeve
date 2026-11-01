import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { loteDePrueba } from '../../test/loteDePrueba.ts'
import { ProgresoDelEspacioVerde } from './ProgresoDelEspacioVerde.tsx'

const tarjeta = (extra: Partial<Parameters<typeof ProgresoDelEspacioVerde>[0]> = {}) => (
  <ProgresoDelEspacioVerde lote={loteDePrueba()} cargando={false} fallo={false} onReintentar={() => {}} {...extra} />
)

describe('ProgresoDelEspacioVerde', () => {
  it('muestra el nivel de cada componente: el árbol por su etapa, flores y bosque por su nivel', () => {
    render(tarjeta())

    const estado = within(screen.getByRole('region', { name: 'Estado de tu espacio verde' }))
    expect(estado.getByText('Árbol').nextElementSibling).toHaveTextContent('Tallo')
    expect(estado.getByText('Flores').nextElementSibling).toHaveTextContent('Nivel 2 de 4')
    expect(estado.getByText('Bosque').nextElementSibling).toHaveTextContent('Nivel 1 de 4')
  })

  it('usa el nivel máximo que dice la API, no uno fijo', () => {
    render(tarjeta({ lote: loteDePrueba({ nivelMaximo: 5 }) }))

    expect(screen.getByText('Nivel 2 de 5', { selector: 'dd' })).toBeInTheDocument()
  })

  it('el progreso hacia el siguiente crecimiento es una barra accesible con lo que entregó la API', () => {
    render(tarjeta({ lote: loteDePrueba({ nutricion: 1, riegosParaElSiguiente: 2 }) }))

    const barra = screen.getByRole('progressbar', { name: 'Progreso hacia el siguiente crecimiento' })
    expect(barra).toHaveAttribute('value', '1')
    expect(barra).toHaveAttribute('max', '3')
    expect(screen.getByText('Te faltan 2 desahogos para que crezca el bosque.')).toBeInTheDocument()
  })

  it('con el lote completo celebra y no muestra barra de progreso', () => {
    render(tarjeta({ lote: loteDePrueba({ completo: true, siguienteEnCrecer: null, nutricion: 0, riegosParaElSiguiente: 0, niveles: { arbol: 4, flores: 4, bosque: 4 }, etapa: 'arbol-adulto' }) }))

    expect(screen.getByText('¡Tu espacio verde está completo!')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.getByText('Árbol adulto')).toBeInTheDocument()
  })

  it('mientras carga lo dice y no muestra cifras', () => {
    render(tarjeta({ lote: null, cargando: true }))

    expect(screen.getByRole('status')).toHaveTextContent('Cargando tu espacio verde')
    expect(screen.queryByText(/Nivel/)).not.toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('si no se pudo cargar, avisa con amabilidad y permite reintentar', () => {
    const onReintentar = vi.fn<() => void>()
    render(tarjeta({ lote: null, fallo: true, onReintentar }))

    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar tu espacio verde')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(onReintentar).toHaveBeenCalledOnce()
  })

  it('no muestra datos que la API no entrega: nada de días, rachas ni puntos', () => {
    const { container } = render(tarjeta())

    expect(container.textContent).not.toMatch(/racha|día \d|puntos|nutrientes/i)
  })
})
