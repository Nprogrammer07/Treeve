import type { ReactNode } from 'react'
import estilos from './Aviso.module.css'

/** Mensaje amable en ámbar suave. Nunca rojo: Treeve no alarma a quien se está desahogando. */
export function Aviso({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className={estilos.aviso}>
      {children}
    </p>
  )
}
