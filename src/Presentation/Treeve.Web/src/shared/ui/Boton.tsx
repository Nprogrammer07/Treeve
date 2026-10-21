import type { ButtonHTMLAttributes } from 'react'
import estilos from './Boton.module.css'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: 'principal' | 'suave' | 'tierra'
}

export function Boton({ variante = 'principal', className, type = 'button', ...resto }: Props) {
  const clases = [estilos.boton, estilos[variante], className].filter(Boolean).join(' ')
  return <button type={type} className={clases} {...resto} />
}
