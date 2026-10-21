import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { MotorSonido } from './motor.ts'
import { SelectorSonido } from './SelectorSonido.tsx'

function motorFalso() {
  return {
    reproducir: vi.fn<MotorSonido['reproducir']>(),
    detener: vi.fn<MotorSonido['detener']>(),
    fijarVolumen: vi.fn<MotorSonido['fijarVolumen']>(),
  }
}

describe('SelectorSonido', () => {
  it('empieza en silencio y no reproduce nada solo', () => {
    const motor = motorFalso()
    render(<SelectorSonido motor={motor} />)

    expect(screen.getByRole('status')).toHaveTextContent('En silencio')
    expect(motor.reproducir).not.toHaveBeenCalled()
  })

  it('ofrece los cinco sonidos del requerimiento HU-08', () => {
    render(<SelectorSonido motor={motorFalso()} />)

    for (const nombre of ['Río', 'Pájaros', 'Lluvia', 'Olas', 'Bosque']) {
      expect(screen.getByRole('button', { name: nombre })).toHaveAttribute('aria-pressed', 'false')
    }
  })

  it('reproduce el sonido elegido y lo anuncia', () => {
    const motor = motorFalso()
    render(<SelectorSonido motor={motor} />)

    fireEvent.click(screen.getByRole('button', { name: 'Lluvia' }))

    expect(motor.reproducir).toHaveBeenCalledExactlyOnceWith('lluvia')
    expect(screen.getByRole('button', { name: 'Lluvia' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Sonando: Lluvia')
  })

  it('cambia de sonido sin dejar dos activos', () => {
    render(<SelectorSonido motor={motorFalso()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Río' }))
    fireEvent.click(screen.getByRole('button', { name: 'Olas' }))

    expect(screen.getByRole('button', { name: 'Río' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Olas' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('pulsar otra vez el sonido activo vuelve al silencio', () => {
    const motor = motorFalso()
    render(<SelectorSonido motor={motor} />)

    fireEvent.click(screen.getByRole('button', { name: 'Río' }))
    fireEvent.click(screen.getByRole('button', { name: 'Río' }))

    expect(motor.detener).toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('En silencio')
  })

  it('ajusta el volumen', () => {
    const motor = motorFalso()
    render(<SelectorSonido motor={motor} />)

    fireEvent.change(screen.getByLabelText('Volumen'), { target: { value: '30' } })

    expect(motor.fijarVolumen).toHaveBeenLastCalledWith(0.3)
  })

  it('detiene el audio al desmontarse', () => {
    const motor = motorFalso()
    render(<SelectorSonido motor={motor} />).unmount()

    expect(motor.detener).toHaveBeenCalled()
  })
})
