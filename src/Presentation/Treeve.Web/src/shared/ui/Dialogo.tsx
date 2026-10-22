import { useEffect, useId, useRef, type ReactNode } from 'react'
import estilos from './Dialogo.module.css'
import { Icono } from './Icono.tsx'

interface Props {
  abierto: boolean
  titulo: string
  descripcion?: string
  onCerrar: () => void
  children: ReactNode
}

/**
 * Ventana modal accesible sobre el elemento nativo <dialog>: el navegador atrapa el foco dentro,
 * marca el resto de la página como inactivo y la cierra con Esc.
 * El contenido solo existe mientras está abierta: al cerrarla, lo que había (por ejemplo un texto a medio escribir) se descarta.
 */
export function Dialogo({ abierto, titulo, descripcion, onCerrar, children }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const idTitulo = useId()
  const idDescripcion = useId()

  useEffect(() => {
    const nodo = dialogo.current
    if (!nodo) return
    if (abierto && !nodo.open) {
      // Respaldo para entornos sin showModal (como las pruebas con jsdom).
      if (typeof nodo.showModal === 'function') nodo.showModal()
      else nodo.setAttribute('open', '')
    } else if (!abierto && nodo.open) {
      if (typeof nodo.close === 'function') nodo.close()
      else nodo.removeAttribute('open')
    }
  }, [abierto])

  return (
    <dialog ref={dialogo} className={estilos.dialogo} aria-labelledby={idTitulo} aria-describedby={descripcion ? idDescripcion : undefined} onClose={onCerrar}>
      {abierto && (
        <div className={estilos.contenido}>
          <button type="button" className={estilos.cerrar} aria-label="Cerrar" onClick={onCerrar}>
            <Icono nombre="cerrar" tamano={20} />
          </button>
          <h2 id={idTitulo} className={estilos.titulo}>
            {titulo}
          </h2>
          {descripcion && (
            <p id={idDescripcion} className={estilos.descripcion}>
              {descripcion}
            </p>
          )}
          {children}
        </div>
      )}
    </dialog>
  )
}
