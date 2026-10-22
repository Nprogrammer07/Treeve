import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PaginaVisitante } from './PaginaVisitante.tsx'

vi.mock('../../scene/EspacioVerde.tsx', () => ({
  EspacioVerde: ({ etapa }: { etapa: string }) => <p>{`escena ${etapa}`}</p>,
}))

const pagina = (extra: Partial<Parameters<typeof PaginaVisitante>[0]> = {}) => (
  <PaginaVisitante acceso={<p>formulario</p>} controlesSonido={<p>sonidos</p>} onElegirAcceso={() => {}} {...extra} />
)

describe('PaginaVisitante', () => {
  it('presenta Treeve con un único título principal', () => {
    render(pagina())

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Cultiva tu paz interior' })).toBeInTheDocument()
  })

  it('muestra el formulario y los controles de sonido que reciba', () => {
    render(pagina())

    expect(screen.getByText('formulario')).toBeInTheDocument()
    expect(screen.getByText('sonidos')).toBeInTheDocument()
  })

  it('muestra el espacio verde ya crecido', () => {
    render(pagina())

    expect(screen.getByText('escena arbol-adulto')).toBeInTheDocument()
    expect(screen.getByText('Vista previa de tu espacio verde')).toBeInTheDocument()
  })

  it('la navegación lleva a las secciones de la página', () => {
    render(pagina())
    const navegacion = within(screen.getByRole('navigation', { name: 'Principal' }))

    expect(navegacion.getByRole('link', { name: 'Cómo funciona' })).toHaveAttribute('href', '#como-funciona')
    expect(navegacion.getByRole('link', { name: 'Nosotros' })).toHaveAttribute('href', '#nosotros')
    expect(screen.getByRole('region', { name: 'Cómo funciona' })).toHaveAttribute('id', 'como-funciona')
    expect(screen.getByRole('region', { name: 'Nosotros' })).toHaveAttribute('id', 'nosotros')
  })

  it('"Empieza a escribir" lleva al formulario de acceso', () => {
    render(pagina())

    const destino = screen.getByRole('link', { name: 'Empieza a escribir' }).getAttribute('href')

    expect(destino).toBe('#acceso')
    expect(document.querySelector(destino ?? '')).toContainElement(screen.getByText('formulario'))
  })

  it('HU-01: muestra accesos visibles a "Iniciar sesión" y "Registrarse" y avisa cuál se eligió', () => {
    const onElegirAcceso = vi.fn<(modo: string) => void>()
    render(pagina({ onElegirAcceso }))
    const navegacion = within(screen.getByRole('navigation', { name: 'Principal' }))

    fireEvent.click(navegacion.getByRole('link', { name: 'Iniciar sesión' }))
    fireEvent.click(navegacion.getByRole('link', { name: 'Registrarse' }))
    fireEvent.click(screen.getByRole('link', { name: 'Empieza a escribir' }))

    expect(onElegirAcceso.mock.calls.map(([modo]) => modo)).toEqual(['login', 'registro', 'registro'])
    expect(navegacion.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '#acceso')
  })

  it('explica los tres pasos en orden', () => {
    render(pagina())

    const pasos = within(screen.getByRole('list')).getAllByRole('listitem')

    expect(pasos).toHaveLength(3)
    expect(pasos[0]).toHaveTextContent('Escribe cómo te sientes')
    expect(pasos[1]).toHaveTextContent('Riega tu árbol')
    expect(pasos[1]).toHaveTextContent('brote, tallo, flor y árbol adulto')
    expect(pasos[2]).toHaveTextContent('Respira y relájate')
  })

  it('usa el vocabulario de Treeve: sin hábitos, terrario ni promesas que el producto no tiene', () => {
    const { container } = render(pagina())

    expect(container.textContent).not.toMatch(/hábito|terrario|gratis/i)
    expect(container.textContent).toMatch(/espacio verde/)
  })

  it('no muestra estadísticas inventadas', () => {
    render(pagina())

    expect(screen.queryByRole('term')).not.toBeInTheDocument()
    expect(screen.queryByText(/racha|plantas|7 días/i)).not.toBeInTheDocument()
  })

  it('indica en el pie que es una versión piloto', () => {
    render(pagina())

    expect(within(screen.getByRole('contentinfo')).getByText(/Versión Piloto Cerrada/)).toBeInTheDocument()
  })
})
