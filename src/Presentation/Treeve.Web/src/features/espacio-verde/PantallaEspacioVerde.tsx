import type { ReactNode, Ref } from 'react'
import { EspacioVerde, type ControlEspacioVerde, type EtapaArbol } from '../../scene/EspacioVerde.tsx'
import { Boton } from '../../shared/ui/Boton.tsx'
import { Icono } from '../../shared/ui/Icono.tsx'
import estilos from './PantallaEspacioVerde.module.css'

interface Props {
  apodo: string
  /** La etapa la calcula el backend (HU-07a); esta pantalla solo la dibuja. */
  etapa: EtapaArbol
  /** Los controles de sonido los entrega app/: las features no se importan entre sí. */
  controlesSonido: ReactNode
  onDesahogarme: () => void
  onSalir: () => void
  /** Texto que cuenta en palabras lo que la escena muestra (por ejemplo, que el espacio verde fue regado). */
  aviso?: string
  mostrarMetricas?: boolean
  ref?: Ref<ControlEspacioVerde>
}

/**
 * HU-07b: la pantalla a la que llega la persona al iniciar sesión. Muestra su espacio verde y el camino a desahogarse.
 * Las tarjetas de historial, mensaje de apoyo y sugerencias se suman cuando existan sus historias y su API.
 */
export function PantallaEspacioVerde({ apodo, etapa, controlesSonido, onDesahogarme, onSalir, aviso = '', mostrarMetricas = false, ref }: Props) {
  const inicial = apodo.trim().charAt(0).toUpperCase()

  return (
    <div className={estilos.pagina}>
      <header className={estilos.encabezado}>
        <div className={estilos.interior}>
          <div className={estilos.saludo}>
            <span className={estilos.avatar} aria-hidden="true">
              {inicial}
            </span>
            <h1 className={estilos.titulo}>Hola, {apodo}</h1>
          </div>
          <div className={estilos.herramientas}>
            {controlesSonido}
            <button type="button" className={estilos.salir} aria-label="Salir" onClick={onSalir}>
              <Icono nombre="salir" tamano={20} />
            </button>
          </div>
        </div>
      </header>

      <main className={estilos.principal}>
        <section aria-label="Tu espacio verde" className={estilos.escena}>
          <EspacioVerde etapa={etapa} pajaros ref={ref} mostrarMetricas={mostrarMetricas} />
          <Boton onClick={onDesahogarme} className={estilos.desahogarme}>
            <Icono nombre="masCirculo" tamano={22} />
            Desahogarme ahora
          </Boton>
        </section>
        {/* La escena es un dibujo: este aviso es la versión en texto de lo que ocurre en ella. */}
        <output className={estilos.aviso}>{aviso}</output>
      </main>

      <nav aria-label="Secciones" className={estilos.navegacion}>
        <button type="button" aria-current="page" className={estilos.seccion} onClick={() => window.scrollTo({ top: 0 })}>
          <Icono nombre="hoja" tamano={18} />
          Mi espacio verde
        </button>
        <button type="button" className={estilos.seccion} onClick={onDesahogarme}>
          <Icono nombre="masCirculo" tamano={18} />
          Desahogarme
        </button>
      </nav>
    </div>
  )
}
