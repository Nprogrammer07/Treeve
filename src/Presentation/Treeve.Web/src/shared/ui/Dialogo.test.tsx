import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Dialogo } from './Dialogo.tsx'

describe('Dialogo', () => {
  it('cerrado no muestra su contenido', () => {
    render(
      <Dialogo abierto={false} titulo="¿Cómo te sientes hoy?" onCerrar={() => {}}>
        <p>contenido</p>
      </Dialogo>,
    )

    expect(screen.queryByText('contenido')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('abierto se anuncia como diálogo con su título y descripción', () => {
    render(
      <Dialogo abierto titulo="Escribe libremente" descripcion="Este es tu espacio seguro." onCerrar={() => {}}>
        <p>contenido</p>
      </Dialogo>,
    )

    const dialogo = screen.getByRole('dialog', { name: 'Escribe libremente' })
    expect(dialogo).toHaveAccessibleDescription('Este es tu espacio seguro.')
    expect(screen.getByText('contenido')).toBeInTheDocument()
  })

  it('se puede cerrar con el botón "Cerrar"', () => {
    const onCerrar = vi.fn<() => void>()
    render(
      <Dialogo abierto titulo="Título" onCerrar={onCerrar}>
        <p>contenido</p>
      </Dialogo>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(onCerrar).toHaveBeenCalledOnce()
  })

  it('al cerrarse descarta el contenido: lo escrito no sobrevive a una nueva apertura', () => {
    const { rerender } = render(
      <Dialogo abierto titulo="Título" onCerrar={() => {}}>
        <input aria-label="texto" />
      </Dialogo>,
    )
    fireEvent.change(screen.getByLabelText('texto'), { target: { value: 'algo privado' } })

    rerender(
      <Dialogo abierto={false} titulo="Título" onCerrar={() => {}}>
        <input aria-label="texto" />
      </Dialogo>,
    )
    rerender(
      <Dialogo abierto titulo="Título" onCerrar={() => {}}>
        <input aria-label="texto" />
      </Dialogo>,
    )

    expect(screen.getByLabelText('texto')).toHaveValue('')
  })
})
