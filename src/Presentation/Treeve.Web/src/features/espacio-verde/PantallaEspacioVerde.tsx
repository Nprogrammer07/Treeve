import type { ReactNode, Ref } from 'react'
import { EspacioVerde, type ControlEspacioVerde } from '../../scene/EspacioVerde.tsx'
import { Boton } from '../../shared/ui/Boton.tsx'
import { Icono } from '../../shared/ui/Icono.tsx'
import type { Lote } from './lote.ts'
import estilos from './PantallaEspacioVerde.module.css'
import { ProgresoDelEspacioVerde } from './ProgresoDelEspacioVerde.tsx'

interface Props {
  apodo: string
  /** El lote lo calcula el backend (HU-07a); esta pantalla solo lo dibuja. null mientras carga o si no se pudo leer. */
  lote: Lote | null
  cargandoLote: boolean
  falloLote: boolean
  onReintentarLote: () => void
  /** Los controles de sonido los entrega app/: las features no se importan entre sí. */
  controlesSonido: ReactNode
  /** La campana de avisos, que entrega app/. Sin ella, el encabezado queda como antes. */
  controlDeAvisos?: ReactNode
  onDesahogarme: () => void
  /** HU-09: abre la ventana para enviar una sugerencia y ver las propias. */
  onSugerir: () => void
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
export function PantallaEspacioVerde({ apodo, lote, cargandoLote, falloLote, onReintentarLote, controlesSonido, controlDeAvisos, onDesahogarme, onSugerir, onSalir, aviso = '', mostrarMetricas = false, ref }: Props) {
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
            {controlDeAvisos}
            {controlesSonido}
            <button type="button" className={estilos.salir} aria-label="Salir" onClick={onSalir}>
              <Icono nombre="salir" tamano={20} />
            </button>
          </div>
        </div>
      </header>

      <main className={estilos.principal}>
        <section aria-label="Tu espacio verde" className={estilos.escena}>
          {/* Sin lote no se dibuja nada: mostrar un lote de mentira confundiría a quien ya tiene el suyo crecido. */}
          {lote ? (
            <EspacioVerde etapa={lote.etapa} nivelFlores={lote.niveles.flores} nivelBosque={lote.niveles.bosque} pajaros ref={ref} mostrarMetricas={mostrarMetricas} />
          ) : (
            <div className={estilos.marcador} aria-hidden="true" />
          )}
          <Boton onClick={onDesahogarme} className={estilos.desahogarme}>
            <Icono nombre="masCirculo" tamano={22} />
            Desahogarme ahora
          </Boton>
        </section>
        {/* La escena es un dibujo: este aviso es la versión en texto de lo que ocurre en ella. */}
        <output className={estilos.aviso}>{aviso}</output>

        <ProgresoDelEspacioVerde lote={lote} cargando={cargandoLote} fallo={falloLote} onReintentar={onReintentarLote} />

        <section aria-labelledby="titulo-sugerencias" className={estilos.sugerencias}>
          <span className={estilos.iconoSugerencias} aria-hidden="true">
            <Icono nombre="idea" tamano={22} />
          </span>
          <div className={estilos.textoSugerencias}>
            <h2 id="titulo-sugerencias" className={estilos.tituloSugerencias}>
              Sugerencias
            </h2>
            <p className={estilos.descripcionSugerencias}>¿Se te ocurre algo que haría Treeve más acogedor? Cuéntaselo directamente a nuestro equipo.</p>
          </div>
          <Boton onClick={onSugerir}>Enviar una sugerencia</Boton>
        </section>
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
        <button type="button" className={estilos.seccion} onClick={onSugerir}>
          <Icono nombre="idea" tamano={18} />
          Sugerencias
        </button>
      </nav>
    </div>
  )
}
