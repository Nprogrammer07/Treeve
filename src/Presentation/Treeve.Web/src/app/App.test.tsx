import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useImperativeHandle, type Ref } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { guardarDesahogo } from '../features/desahogos/api.ts'
import { iniciarSesion, registrar } from '../features/identidad/api.ts'
import type { MotorSonido, TipoSonido } from '../features/sonidos/motor.ts'
import type { ControlEspacioVerde } from '../scene/EspacioVerde.tsx'
import { borrarSesion, guardarSesion } from '../shared/api/sesion.ts'
import { loteDePrueba } from '../test/loteDePrueba.ts'
import App from './App.tsx'

const regar = vi.hoisted(() => vi.fn<() => void>())

vi.mock('../scene/EspacioVerde.tsx', () => ({
  EspacioVerde: ({ etapa, ref }: { etapa: string; ref?: Ref<ControlEspacioVerde> }) => {
    useImperativeHandle(ref, () => ({ regar, crecer: () => {} }), [])
    return <p>{`escena ${etapa}`}</p>
  },
}))
vi.mock('../features/desahogos/api.ts', () => ({ guardarDesahogo: vi.fn<typeof guardarDesahogo>() }))
vi.mock('../features/notificaciones/api.ts', () => ({ listarNotificaciones: () => Promise.resolve([]), marcarComoLeida: () => Promise.resolve() }))
vi.mock('../features/espacio-verde/api.ts', () => ({ consultarEspacioVerde: () => Promise.resolve(loteDePrueba()) }))
vi.mock('../features/identidad/api.ts', () => ({
  registrar: vi.fn<typeof registrar>(),
  iniciarSesion: vi.fn<typeof iniciarSesion>(),
}))
// Un motor de audio falso con el mismo comportamiento de estado que el real (jsdom no tiene Web Audio).
vi.mock('../features/sonidos/motor.ts', () => ({
  crearMotorSonido: (): MotorSonido => {
    let actual: TipoSonido | null = null
    const oyentes = new Set<() => void>()
    const cambiarA = (tipo: TipoSonido | null) => {
      actual = tipo
      for (const oyente of oyentes) oyente()
    }
    return {
      reproducir: (tipo) => cambiarA(tipo),
      detener: () => cambiarA(null),
      fijarVolumen: () => {},
      leerActual: () => actual,
      suscribirse: (oyente) => {
        oyentes.add(oyente)
        return () => {
          oyentes.delete(oyente)
        }
      },
    }
  },
}))

const sesion = { usuarioId: 'u-1', apodo: 'Luis', token: 'token-secreto', expiraEn: '2999-01-01T00:00:00Z' }
const navegacion = () => within(screen.getByRole('navigation', { name: 'Principal' }))

beforeEach(() => {
  regar.mockClear()
  vi.mocked(guardarDesahogo).mockReset()
  vi.mocked(guardarDesahogo).mockResolvedValue({ notaId: 'n-1', creadaEn: '2026-10-22T20:00:00-05:00', mensajeDeApoyo: { texto: 'Hola, Luis. Gracias por contarlo.', esDeCrisis: false } })
})

afterEach(() => {
  borrarSesion()
})

describe('sin sesión', () => {
  it('abre la página de visitante con el registro y el sonido ambiental', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Cultiva tu paz interior' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear mi cuenta' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('En silencio')
  })

  it('"Iniciar sesión" cambia el formulario y se puede volver al registro', () => {
    render(<App />)

    fireEvent.click(navegacion().getByRole('link', { name: 'Iniciar sesión' }))
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Regístrate' }))

    expect(screen.getByRole('button', { name: 'Crear mi cuenta' })).toBeInTheDocument()
  })
})

describe('paso 1: al entrar, llega a su espacio verde', () => {
  it('al iniciar sesión pasa solo al espacio verde y lo saluda por el apodo', async () => {
    vi.mocked(iniciarSesion).mockImplementation(() => {
      guardarSesion(sesion)
      return Promise.resolve()
    })
    render(<App />)

    fireEvent.click(navegacion().getByRole('link', { name: 'Iniciar sesión' }))
    fireEvent.change(screen.getByLabelText(/^Usuario o correo/), { target: { value: 'luis' } })
    fireEvent.change(screen.getByLabelText(/^Contraseña/), { target: { value: 'Treeve2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Hola, Luis' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Desahogarme ahora' })).toBeInTheDocument()
  })

  it('al registrarse también entra directo (acceso automático)', async () => {
    vi.mocked(registrar).mockImplementation(() => {
      guardarSesion(sesion)
      return Promise.resolve()
    })
    render(<App />)

    fireEvent.change(screen.getByLabelText(/^Nombre completo/), { target: { value: 'Luis Daro' } })
    fireEvent.change(screen.getByLabelText(/^Apodo/), { target: { value: 'Luis' } })
    fireEvent.change(screen.getByLabelText(/^Usuario/), { target: { value: 'luis.d' } })
    fireEvent.change(screen.getByLabelText(/^Contraseña/), { target: { value: 'Treeve2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear mi cuenta' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Hola, Luis' })).toBeInTheDocument()
  })

  it('con una sesión guardada en la pestaña entra directo, sin pasar por la página de visitante', () => {
    guardarSesion(sesion)

    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Hola, Luis' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Crear mi cuenta' })).not.toBeInTheDocument()
  })

  it('"Salir" vuelve a la página de visitante', () => {
    guardarSesion(sesion)
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Salir' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Cultiva tu paz interior' })).toBeInTheDocument()
  })
})

describe('pasos 2 y 3: desahogarse', () => {
  beforeEach(() => {
    guardarSesion(sesion)
  })

  it('paso 2: "Desahogarme ahora" abre la elección de emoción', () => {
    render(<App />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Desahogarme ahora' }))

    const dialogo = within(screen.getByRole('dialog', { name: '¿Cómo te sientes hoy?' }))
    expect(dialogo.getByRole('button', { name: 'Tristeza' })).toBeInTheDocument()
    expect(dialogo.getByRole('button', { name: 'Felicidad' })).toBeInTheDocument()
  })

  it('el menú inferior también abre la elección de emoción', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Desahogarme' }))

    expect(screen.getByRole('dialog', { name: '¿Cómo te sientes hoy?' })).toBeInTheDocument()
  })

  it('paso 3: al escoger la emoción aparece dónde escribir el desahogo', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Desahogarme ahora' }))
    fireEvent.click(screen.getByRole('button', { name: 'Duda' }))

    expect(screen.getByLabelText('Escribe lo que sientes')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Hoy me sentí...')).toBeInTheDocument()
  })

  it('al guardar muestra el mensaje de apoyo y, al cerrarlo, riega el espacio verde y lo cuenta con texto', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Desahogarme ahora' }))
    fireEvent.click(screen.getByRole('button', { name: 'Duda' }))
    fireEvent.change(screen.getByLabelText('Escribe lo que sientes'), { target: { value: 'no sé' } })
    fireEvent.click(screen.getByRole('button', { name: 'Regar mi espacio verde' }))

    expect(await screen.findByRole('dialog', { name: 'Un mensaje para ti' })).toHaveTextContent('Hola, Luis. Gracias por contarlo.')
    expect(guardarDesahogo).toHaveBeenCalledWith({ emocion: 'duda', texto: 'no sé' })
    expect(regar).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(regar).toHaveBeenCalledOnce()
    // Hay dos avisos de estado en pantalla (sonido y riego): se busca el del riego por su texto.
    expect(screen.getByText('Tu desahogo regó tu espacio verde.').tagName).toBe('OUTPUT')
  })

  it('si cierra el mensaje con la X, el desahogo igual se guardó y el espacio verde se riega', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Desahogarme ahora' }))
    fireEvent.click(screen.getByRole('button', { name: 'Miedo' }))
    fireEvent.change(screen.getByLabelText('Escribe lo que sientes'), { target: { value: 'tengo miedo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Regar mi espacio verde' }))
    await screen.findByRole('dialog', { name: 'Un mensaje para ti' })

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(regar).toHaveBeenCalledOnce()
  })

  it('si cierra la ventana a medias no se guarda nada ni se riega', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Desahogarme ahora' }))
    fireEvent.click(screen.getByRole('button', { name: 'Miedo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(guardarDesahogo).not.toHaveBeenCalled()
    expect(regar).not.toHaveBeenCalled()
  })
})

describe('HU-08: el sonido no se corta al entrar', () => {
  it('lo que empezó a sonar en la página de visitante sigue activo en el espacio verde', async () => {
    vi.mocked(iniciarSesion).mockImplementation(() => {
      guardarSesion(sesion)
      return Promise.resolve()
    })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Río' }))

    fireEvent.click(navegacion().getByRole('link', { name: 'Iniciar sesión' }))
    fireEvent.change(screen.getByLabelText(/^Usuario o correo/), { target: { value: 'luis' } })
    fireEvent.change(screen.getByLabelText(/^Contraseña/), { target: { value: 'Treeve2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    await screen.findByRole('heading', { level: 1, name: 'Hola, Luis' })

    expect(screen.getByRole('button', { name: 'Río' })).toHaveAttribute('aria-pressed', 'true')
  })
})
