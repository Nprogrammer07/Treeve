import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Notificacion } from './tipos.ts'
import { VentanaDeAvisos } from './VentanaDeAvisos.tsx'

const aviso = (id: string, extra: Partial<Notificacion> = {}): Notificacion => ({ id, tipo: 'otro', mensaje: `Mensaje ${id}`, creadaEn: '2026-10-31T10:00:00-05:00', leida: false, ...extra })

const ventana = (extra: Partial<Parameters<typeof VentanaDeAvisos>[0]> = {}) => (
  <VentanaDeAvisos
    abierto
    onCerrar={() => {}}
    notificaciones={[aviso('n-1'), aviso('n-2', { leida: true })]}
    cargando={false}
    fallo={false}
    falloAlMarcar={false}
    onReintentar={() => {}}
    onMarcarLeida={() => {}}
    onMarcarTodas={() => {}}
    onVerSugerencias={() => {}}
    onIrAStaff={() => {}}
    {...extra}
  />
)

describe('VentanaDeAvisos', () => {
  it('cerrada no muestra nada', () => {
    render(ventana({ abierto: false }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('se puede cerrar con la X', () => {
    const onCerrar = vi.fn<() => void>()
    render(ventana({ onCerrar }))

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(onCerrar).toHaveBeenCalledOnce()
  })

  describe('la lista', () => {
    it('muestra el mensaje de cada aviso tal cual lo escribió el backend, con su fecha', () => {
      render(ventana({ notificaciones: [aviso('n-1', { mensaje: 'Ahora formas parte del staff de Treeve. Ya puedes entrar al panel de staff.' })] }))

      expect(screen.getByRole('dialog', { name: 'Tus avisos' })).toBeInTheDocument()
      expect(screen.getByText('Ahora formas parte del staff de Treeve. Ya puedes entrar al panel de staff.')).toBeInTheDocument()
      expect(screen.getByText('31 oct 2026')).toBeInTheDocument()
    })

    it('un mensaje con marcas HTML se muestra como texto, nunca como HTML', () => {
      render(ventana({ notificaciones: [aviso('n-1', { mensaje: '<b>hola</b> <img src=x onerror=alert(1)>' })] }))

      expect(screen.getByText('<b>hola</b> <img src=x onerror=alert(1)>')).toBeInTheDocument()
      expect(document.querySelector('dialog b, dialog img')).toBeNull()
    })

    it('los avisos sin leer llevan la palabra "Nuevo": no se distinguen solo por el color', () => {
      render(ventana())

      const [sinLeer, leido] = screen.getAllByRole('listitem')
      expect(within(sinLeer as HTMLElement).getByText('Nuevo')).toBeInTheDocument()
      expect(within(leido as HTMLElement).queryByText('Nuevo')).not.toBeInTheDocument()
    })

    it('cuenta con texto cuántos quedan sin leer y cuando todo está al día lo dice', () => {
      const { rerender } = render(ventana({ notificaciones: [aviso('n-1'), aviso('n-2'), aviso('n-3', { leida: true })] }))
      expect(screen.getByText('2 avisos sin leer')).toBeInTheDocument()

      rerender(ventana({ notificaciones: [aviso('n-1'), aviso('n-2', { leida: true })] }))
      expect(screen.getByText('1 aviso sin leer')).toBeInTheDocument()

      rerender(ventana({ notificaciones: [aviso('n-1', { leida: true })] }))
      expect(screen.getByText('Todo al día.')).toBeInTheDocument()
      expect(screen.getByText('Todo al día.').tagName).toBe('OUTPUT')
    })

    it('sin avisos lo dice con amabilidad', () => {
      render(ventana({ notificaciones: [] }))

      expect(screen.getByText('No tienes avisos por ahora.')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Marcar todos como leídos' })).not.toBeInTheDocument()
    })
  })

  describe('marcar como leído', () => {
    it('cada aviso sin leer tiene su botón, descrito por su mensaje; el leído no lo tiene', () => {
      const onMarcarLeida = vi.fn<(id: string) => void>()
      render(ventana({ onMarcarLeida, notificaciones: [aviso('n-1', { mensaje: 'Primero' }), aviso('n-2', { leida: true })] }))

      const botones = screen.getAllByRole('button', { name: 'Marcar como leído' })
      expect(botones).toHaveLength(1)
      expect(botones[0]).toHaveAccessibleDescription('Primero')
      fireEvent.click(botones[0] as HTMLElement)

      expect(onMarcarLeida).toHaveBeenCalledWith('n-1')
    })

    it('"Marcar todos como leídos" aparece solo si hay alguno sin leer', () => {
      const onMarcarTodas = vi.fn<() => void>()
      const { rerender } = render(ventana({ onMarcarTodas }))

      fireEvent.click(screen.getByRole('button', { name: 'Marcar todos como leídos' }))
      expect(onMarcarTodas).toHaveBeenCalledOnce()

      rerender(ventana({ onMarcarTodas, notificaciones: [aviso('n-1', { leida: true })] }))
      expect(screen.queryByRole('button', { name: 'Marcar todos como leídos' })).not.toBeInTheDocument()
    })

    it('si no se pudo marcar, avisa con amabilidad', () => {
      render(ventana({ falloAlMarcar: true }))

      expect(screen.getByRole('alert')).toHaveTextContent('No pudimos marcarlo como leído')
    })
  })

  describe('acciones según el tipo de aviso', () => {
    it('una sugerencia respondida lleva al historial y da el aviso por leído', () => {
      const onVerSugerencias = vi.fn<() => void>()
      const onMarcarLeida = vi.fn<(id: string) => void>()
      render(ventana({ onVerSugerencias, onMarcarLeida, notificaciones: [aviso('n-1', { tipo: 'sugerencia_respondida' })] }))

      fireEvent.click(screen.getByRole('button', { name: 'Ver mis sugerencias' }))

      expect(onVerSugerencias).toHaveBeenCalledOnce()
      expect(onMarcarLeida).toHaveBeenCalledWith('n-1')
    })

    it('si ya estaba leído, ir a verlo no vuelve a marcarlo', () => {
      const onMarcarLeida = vi.fn<(id: string) => void>()
      render(ventana({ onMarcarLeida, notificaciones: [aviso('n-1', { tipo: 'sugerencia_respondida', leida: true })] }))

      fireEvent.click(screen.getByRole('button', { name: 'Ver mis sugerencias' }))

      expect(onMarcarLeida).not.toHaveBeenCalled()
    })

    it('el ascenso a staff ofrece ir al panel de staff', () => {
      const onIrAStaff = vi.fn<() => void>()
      render(ventana({ onIrAStaff, notificaciones: [aviso('n-1', { tipo: 'ascendido_a_staff' })] }))

      fireEvent.click(screen.getByRole('button', { name: 'Ir al panel de staff' }))

      expect(onIrAStaff).toHaveBeenCalledOnce()
    })

    it('la revocación y los tipos desconocidos solo muestran su mensaje, sin acción propia', () => {
      render(ventana({ notificaciones: [aviso('n-1', { tipo: 'staff_revocado', leida: true }), aviso('n-2', { tipo: 'otro', leida: true })] }))

      expect(screen.queryByRole('button', { name: /Ver mis sugerencias|Ir al panel/ })).not.toBeInTheDocument()
    })

    it('el botón de staff solo aparece en el aviso de ascenso', () => {
      render(ventana({ notificaciones: [aviso('n-1', { tipo: 'sugerencia_respondida' }), aviso('n-2', { tipo: 'staff_revocado' })] }))

      expect(screen.queryByRole('button', { name: 'Ir al panel de staff' })).not.toBeInTheDocument()
    })
  })

  describe('cuando algo falla o carga', () => {
    it('mientras carga lo dice', () => {
      render(ventana({ notificaciones: [], cargando: true }))

      expect(screen.getByText('Cargando tus avisos…').tagName).toBe('OUTPUT')
      expect(screen.queryByText('No tienes avisos por ahora.')).not.toBeInTheDocument()
    })

    it('si no se pudieron cargar, avisa y permite reintentar', () => {
      const onReintentar = vi.fn<() => void>()
      render(ventana({ notificaciones: [], fallo: true, onReintentar }))

      expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar tus avisos')
      fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

      expect(onReintentar).toHaveBeenCalledOnce()
      expect(screen.queryByText('No tienes avisos por ahora.')).not.toBeInTheDocument()
    })
  })
})
