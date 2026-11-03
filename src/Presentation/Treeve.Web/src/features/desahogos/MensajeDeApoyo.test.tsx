import { StrictMode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DURACION_DE_PAUSA, DURACION_TOTAL_OBJETIVO, INTERVALO_POR_LETRA, intervaloParaTexto } from './animacion.ts'
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

// Lo que ve la persona: el párrafo visible (no la copia invisible para lectores de pantalla).
const parrafoVisible = () => document.querySelector('[aria-hidden="true"] p')
const textoVisible = () => parrafoVisible()?.textContent?.replace(/\s/g, '') ?? ''
// Las esperas usan waitFor con un tope generoso respecto a la duración real (siempre acotada por DURACION_TOTAL_OBJETIVO).
const TOPE_TERMINADO = DURACION_TOTAL_OBJETIVO + 500
const esperarTerminar = (texto: string) =>
  waitFor(() => expect(textoVisible()).toBe(texto.replace(/\s/g, '')), { timeout: TOPE_TERMINADO })

describe('MensajeDeApoyo', () => {
  beforeEach(() => simularReducirMovimiento(false))
  afterEach(() => vi.unstubAllGlobals())

  describe('contenido', () => {
    it('muestra el mensaje tal como lo entrega la API, una vez termina de escribirse', async () => {
      render(<MensajeDeApoyo mensaje={{ texto: TEXTO, esDeCrisis: false }} onSeguir={() => {}} />)

      await esperarTerminar(TEXTO)
      expect(parrafoVisible()?.textContent).toContain(TEXTO)
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
    it('empieza por la pausa "El bosque te está escuchando…", sin letras del mensaje a la vista', () => {
      render(<MensajeDeApoyo mensaje={{ texto: TEXTO, esDeCrisis: false }} onSeguir={() => {}} />)

      expect(parrafoVisible()?.textContent).toBe('El bosque te está escuchando…')
    })

    it('tras la pausa, el texto crece letra por letra hasta completarse', async () => {
      render(<MensajeDeApoyo mensaje={{ texto: 'abcd', esDeCrisis: false }} onSeguir={() => {}} />)

      // En algún momento intermedio el visible contiene algunas letras, pero no todas.
      await waitFor(
        () => {
          const letras = textoVisible()
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

      expect(parrafoVisible()?.textContent).toContain(TEXTO)
      expect(screen.getByRole('button', { name: 'Seguir' })).toBeInTheDocument()
      expect(onSeguir).not.toHaveBeenCalled()
    })

    it('"Saltar" mientras se escribe también muestra todo el mensaje', async () => {
      render(<MensajeDeApoyo mensaje={{ texto: TEXTO, esDeCrisis: false }} onSeguir={() => {}} />)
      await waitFor(() => expect(parrafoVisible()?.textContent).not.toBe('El bosque te está escuchando…'), { timeout: DURACION_DE_PAUSA + 200 })

      fireEvent.click(screen.getByRole('button', { name: 'Saltar' }))

      expect(parrafoVisible()?.textContent).toContain(TEXTO)
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

    it('tampoco se llama dos veces en StrictMode (el doble montaje de los efectos en desarrollo no debe duplicar el riego)', () => {
      const onAparece = vi.fn<() => void>()
      render(
        <StrictMode>
          <MensajeDeApoyo mensaje={{ texto: TEXTO, esDeCrisis: false }} onSeguir={() => {}} onAparece={onAparece} />
        </StrictMode>,
      )

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

      expect(parrafoVisible()?.textContent).toBe(TEXTO)
      expect(parrafoVisible()?.textContent).not.toBe('El bosque te está escuchando…')
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

  describe('un mensaje de crisis aparece completo sin esperar (línea de ayuda sin latencia)', () => {
    const crisis = { texto: 'Estamos contigo. Si lo necesitas, Línea 106 (24h) te acompaña.', esDeCrisis: true }

    it('se muestra entero de inmediato, sin pausa ni escritura letra por letra', () => {
      render(<MensajeDeApoyo mensaje={crisis} onSeguir={() => {}} />)

      expect(parrafoVisible()?.textContent).toBe(crisis.texto)
      expect(parrafoVisible()?.textContent).not.toBe('El bosque te está escuchando…')
    })

    it('"Seguir" está disponible desde el inicio, sin "Saltar"', () => {
      render(<MensajeDeApoyo mensaje={crisis} onSeguir={() => {}} />)

      expect(screen.getByRole('button', { name: 'Seguir' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Saltar' })).not.toBeInTheDocument()
    })

    it('conserva el fondo cálido de crisis sin agregar enlaces propios', () => {
      render(<MensajeDeApoyo mensaje={crisis} onSeguir={() => {}} />)

      expect(document.querySelector('[data-crisis="true"]')).not.toBeNull()
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
    })
  })

  describe('lectores de pantalla (no anuncia letra por letra)', () => {
    it('el texto completo está en el DOM una sola vez desde el principio y la animación visual queda aria-hidden', () => {
      const { container } = render(<MensajeDeApoyo mensaje={{ texto: TEXTO, esDeCrisis: false }} onSeguir={() => {}} />)

      const texto = TEXTO.replace(/\s/g, '')
      const nodosConElTexto = Array.from(container.querySelectorAll('p')).filter((p) => (p.textContent ?? '').replace(/\s/g, '') === texto)
      expect(nodosConElTexto).toHaveLength(1)
      // La animación visual (lo que crece letra por letra) está dentro de un contenedor aria-hidden,
      // así el lector de pantalla no la narra; el texto accesible completo no tiene aria-live que lo reanuncie.
      expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
      expect(container.querySelector('[aria-live]')).toBeNull()
    })
  })

  describe('duración acotada (no se eterniza con textos largos)', () => {
    it('para un mensaje largo, el intervalo por letra se acorta para no pasar del tope total', () => {
      // Un mensaje de ~230 letras es lo típico que devuelve la API.
      const largo = 'a'.repeat(230)
      const porLetra = intervaloParaTexto(largo)

      const total = DURACION_DE_PAUSA + porLetra * largo.length
      expect(total).toBeLessThanOrEqual(DURACION_TOTAL_OBJETIVO)
    })

    it('para un mensaje corto, se usa el intervalo cómodo (no se acelera innecesariamente)', () => {
      expect(intervaloParaTexto('Hola')).toBe(INTERVALO_POR_LETRA)
    })
  })
})
