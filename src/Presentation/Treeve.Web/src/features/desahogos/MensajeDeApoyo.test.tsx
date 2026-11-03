import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DURACION_DE_PAUSA, INTERVALO_POR_LETRA } from './animacion.ts'
import { MensajeDeApoyo } from './MensajeDeApoyo.tsx'

function simularReducirMovimiento(reducir: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((consulta: string) => ({
      matches: consulta === '(prefers-reduced-motion: reduce)' && reducir,
      media: consulta,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })),
  )
}

const TEXTO = 'Hola, Ani. Gracias por contarlo.'

// Las esperas por fase usan waitFor (poll) con un tiempo máximo generoso respecto a la duración real.
const TOPE_TERMINADO = DURACION_DE_PAUSA + (TEXTO.length + 2) * INTERVALO_POR_LETRA + 200
const esperarTerminar = (texto: string) => waitFor(() => expect(screen.getByText(texto)).toBeInTheDocument(), { timeout: TOPE_TERMINADO })

describe('MensajeDeApoyo', () => {
  beforeEach(() => simularReducirMovimiento(false))
  afterEach(() => vi.unstubAllGlobals())

  describe('contenido', () => {
    it('muestra el mensaje tal como lo entrega la API, una vez termina de escribirse', async () => {
      render(<MensajeDeApoyo mensaje={{ texto: TEXTO, esDeCrisis: false }} onSeguir={() => {}} />)

      await esperarTerminar(TEXTO)
      expect(screen.getByText(TEXTO)).toBeInTheDocument()
    })

    it('un mensaje de crisis se marca para darle un fondo más cálido, y la interfaz no agrega teléfonos ni enlaces propios', () => {
      render(<MensajeDeApoyo mensaje={{ texto: 'Estamos contigo. Si lo necesitas, Línea 106', esDeCrisis: true }} onSeguir={() => {}} />)

      const tarjeta = document.querySelector('[data-crisis="true"]')
      expect(tarjeta).not.toBeNull()
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
    })

    it('un mensaje común no se marca como de crisis', () => {
      render(<MensajeDeApoyo mensaje={{ texto: 'Un mensaje', esDeCrisis: false }} onSeguir={() => {}} />)

      expect(document.querySelector('[data-crisis="false"]')).not.toBeNull()
    })

    it('lleva el foco al mensaje para que un lector de pantalla lo lea de inmediato', () => {
      render(<MensajeDeApoyo mensaje={{ texto: TEXTO, esDeCrisis: false }} onSeguir={() => {}} />)

      expect(document.activeElement).toBe(document.querySelector('[data-crisis]'))
    })
  })

  describe('la animación (HU-06a-4)', () => {
    it('empieza por la pausa "El bosque te está escuchando…", sin el texto', () => {
      render(<MensajeDeApoyo mensaje={{ texto: TEXTO, esDeCrisis: false }} onSeguir={() => {}} />)

      expect(screen.getByText('El bosque te está escuchando…')).toBeInTheDocument()
      expect(screen.queryByText(TEXTO)).not.toBeInTheDocument()
    })

    it('tras la pausa, el texto crece letra por letra hasta completarse', async () => {
      render(<MensajeDeApoyo mensaje={{ texto: 'abcd', esDeCrisis: false }} onSeguir={() => {}} />)

      // En algún momento intermedio el párrafo contiene algunas letras, pero no todas.
      await waitFor(
        () => {
          const parrafo = document.querySelector('p')
          const letras = (parrafo?.textContent ?? '').replace(/\s/g, '')
          expect(letras.length).toBeGreaterThan(0)
          expect(letras.length).toBeLessThan(4)
        },
        { timeout: DURACION_DE_PAUSA + INTERVALO_POR_LETRA * 3 + 200 },
      )
      await esperarTerminar('abcd')
    })

    it('"Seguir" solo aparece cuando el mensaje terminó; antes se ofrece "Saltar"', async () => {
      const corto = 'Hola'
      render(<MensajeDeApoyo mensaje={{ texto: corto, esDeCrisis: false }} onSeguir={() => {}} />)

      expect(screen.getByRole('button', { name: 'Saltar' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Seguir' })).not.toBeInTheDocument()
      await waitFor(() => expect(screen.getByRole('button', { name: 'Seguir' })).toBeInTheDocument(), { timeout: DURACION_DE_PAUSA + corto.length * INTERVALO_POR_LETRA + 500 })

      expect(screen.queryByRole('button', { name: 'Saltar' })).not.toBeInTheDocument()
    })

    it('"Saltar" durante la pausa muestra el mensaje completo sin cerrarlo', async () => {
      const onSeguir = vi.fn<() => void>()
      render(<MensajeDeApoyo mensaje={{ texto: TEXTO, esDeCrisis: false }} onSeguir={onSeguir} />)

      fireEvent.click(screen.getByRole('button', { name: 'Saltar' }))

      expect(screen.getByText(TEXTO)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Seguir' })).toBeInTheDocument()
      expect(onSeguir).not.toHaveBeenCalled()
    })

    it('"Saltar" mientras se escribe también muestra todo el mensaje', async () => {
      render(<MensajeDeApoyo mensaje={{ texto: TEXTO, esDeCrisis: false }} onSeguir={() => {}} />)
      await waitFor(() => expect(screen.queryByText('El bosque te está escuchando…')).not.toBeInTheDocument(), { timeout: DURACION_DE_PAUSA + 200 })

      fireEvent.click(screen.getByRole('button', { name: 'Saltar' }))

      expect(screen.getByText(TEXTO)).toBeInTheDocument()
    })

    it('"Seguir" avisa, nunca se cierra solo', async () => {
      const onSeguir = vi.fn<() => void>()
      render(<MensajeDeApoyo mensaje={{ texto: 'Hola', esDeCrisis: false }} onSeguir={onSeguir} />)
      fireEvent.click(screen.getByRole('button', { name: 'Saltar' }))

      fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))

      expect(onSeguir).toHaveBeenCalledOnce()
    })
  })

  describe('sincronización con la escena (HU-07b)', () => {
    it('onAparece se llama una sola vez, al aparecer el mensaje, para disparar el riego', () => {
      const onAparece = vi.fn<() => void>()
      const { rerender } = render(<MensajeDeApoyo mensaje={{ texto: TEXTO, esDeCrisis: false }} onSeguir={() => {}} onAparece={onAparece} />)

      expect(onAparece).toHaveBeenCalledOnce()
      // Un cambio de props no vuelve a llamar: la escena no se riega dos veces por el mismo mensaje.
      rerender(<MensajeDeApoyo mensaje={{ texto: TEXTO, esDeCrisis: false }} onSeguir={() => {}} onAparece={onAparece} />)
      expect(onAparece).toHaveBeenCalledOnce()
    })

    it('sin onAparece, no se cae', () => {
      expect(() => render(<MensajeDeApoyo mensaje={{ texto: TEXTO, esDeCrisis: false }} onSeguir={() => {}} />)).not.toThrow()
    })
  })

  describe('cuando la persona pidió reducir el movimiento al sistema', () => {
    beforeEach(() => simularReducirMovimiento(true))

    it('aparece el mensaje completo, sin pausa ni escritura letra por letra', () => {
      render(<MensajeDeApoyo mensaje={{ texto: TEXTO, esDeCrisis: false }} onSeguir={() => {}} />)

      expect(screen.getByText(TEXTO)).toBeInTheDocument()
      expect(screen.queryByText('El bosque te está escuchando…')).not.toBeInTheDocument()
    })

    it('"Seguir" está disponible desde el inicio, sin "Saltar"', () => {
      render(<MensajeDeApoyo mensaje={{ texto: TEXTO, esDeCrisis: false }} onSeguir={() => {}} />)

      expect(screen.getByRole('button', { name: 'Seguir' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Saltar' })).not.toBeInTheDocument()
    })

    it('la escena igual se riega: onAparece sigue llamándose', () => {
      const onAparece = vi.fn<() => void>()
      render(<MensajeDeApoyo mensaje={{ texto: TEXTO, esDeCrisis: false }} onSeguir={() => {}} onAparece={onAparece} />)

      expect(onAparece).toHaveBeenCalledOnce()
    })
  })
})
