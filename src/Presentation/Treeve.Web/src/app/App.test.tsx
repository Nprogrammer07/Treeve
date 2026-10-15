import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App.tsx'

describe('App', () => {
  it('muestra el nombre de Treeve como título principal', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Treeve' })).toBeInTheDocument()
  })
})
