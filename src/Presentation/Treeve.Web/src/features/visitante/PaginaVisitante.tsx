import type { ReactNode } from 'react'
import { EspacioVerde } from '../../scene/EspacioVerde.tsx'
import { Icono, type NombreIcono } from '../../shared/ui/Icono.tsx'
import estilos from './PaginaVisitante.module.css'

export type ModoDeAcceso = 'registro' | 'login'

interface Props {
  /** Las features no se importan entre sí: app/ entrega el formulario de acceso (registro o login) y el selector de sonido. */
  acceso: ReactNode
  controlesSonido: ReactNode
  /** HU-01: accesos visibles a "Iniciar sesión" y "Registrarse". app/ decide qué formulario mostrar. */
  onElegirAcceso: (modo: ModoDeAcceso) => void
  mostrarMetricas?: boolean
}

const PASOS: { icono: NombreIcono; titulo: string; texto: string }[] = [
  { icono: 'chispas', titulo: 'Escribe cómo te sientes', texto: 'Un espacio seguro y privado para desahogarte sin juicios, a tu ritmo. Solo tú puedes leer lo que escribes.' },
  { icono: 'hoja', titulo: 'Riega tu árbol', texto: 'Cada desahogo riega tu árbol y, poco a poco, lo hace crecer: brote, tallo, flor y árbol adulto.' },
  { icono: 'altavoz', titulo: 'Respira y relájate', texto: 'Acompaña tus momentos con sonidos de la naturaleza que calman la mente.' },
]

/** HU-01: página de visitante. Muestra qué es Treeve e invita a registrarse. */
export function PaginaVisitante({ acceso, controlesSonido, onElegirAcceso, mostrarMetricas = false }: Props) {
  return (
    <>
      <header className={estilos.encabezado}>
        <div className={estilos.encabezadoInterior}>
          <a href="#inicio" className={estilos.marca}>
            <span className={estilos.logo}>
              <Icono nombre="hoja" tamano={22} />
            </span>
            Treeve
          </a>
          <nav aria-label="Principal" className={estilos.navegacion}>
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#nosotros">Nosotros</a>
            <a href="#acceso" onClick={() => onElegirAcceso('login')}>
              Iniciar sesión
            </a>
            <a href="#acceso" onClick={() => onElegirAcceso('registro')} className={estilos.registrarse}>
              Registrarse
            </a>
          </nav>
        </div>
      </header>

      <main id="inicio" className={estilos.principal}>
        <section className={estilos.heroe}>
          <div className={estilos.presentacion}>
            <p className={estilos.pildora}>
              <Icono nombre="hoja" tamano={16} />
              Bienestar emocional
            </p>
            <h1 className={estilos.titulo}>Cultiva tu paz interior</h1>
            <p className={estilos.lema}>Desahógate escribiendo lo que sientes y observa cómo tu espacio verde crece y florece en Treeve.</p>
            {controlesSonido}
            <a href="#acceso" onClick={() => onElegirAcceso('registro')} className={estilos.llamado}>
              Empieza a escribir
            </a>
          </div>
          <div id="acceso">{acceso}</div>
        </section>

        <section aria-labelledby="titulo-vista-previa" className={estilos.vistaPrevia}>
          <div className={estilos.escena}>
            <EspacioVerde etapa="arbol-adulto" pajaros mostrarMetricas={mostrarMetricas} />
            <p className={estilos.insignia}>
              <span className={estilos.punto} aria-hidden="true" />
              Vista previa de tu espacio verde
            </p>
          </div>
          <div className={estilos.banda}>
            <div>
              <h2 id="titulo-vista-previa" className={estilos.subtitulo}>
                Tu espacio verde crece contigo
              </h2>
              <p className={estilos.textoBanda}>Cada desahogo riega tu árbol y lo ayuda a pasar de brote a tallo, de tallo a flor y, con el tiempo, a árbol adulto.</p>
            </div>
          </div>
        </section>

        <section id="como-funciona" aria-labelledby="titulo-como-funciona" className={estilos.seccion}>
          <h2 id="titulo-como-funciona" className={estilos.tituloSeccion}>
            Cómo funciona
          </h2>
          <ol className={estilos.pasos}>
            {PASOS.map(({ icono, titulo, texto }) => (
              <li key={titulo} className={estilos.paso}>
                <span className={estilos.iconoPaso}>
                  <Icono nombre={icono} tamano={22} />
                </span>
                <h3 className={estilos.tituloPaso}>{titulo}</h3>
                <p className={estilos.textoPaso}>{texto}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="nosotros" aria-labelledby="titulo-nosotros" className={estilos.seccion}>
          <h2 id="titulo-nosotros" className={estilos.tituloSeccion}>
            Nosotros
          </h2>
          <p className={estilos.nosotros}>
            Treeve nace como un proyecto estudiantil que une tecnología y cuidado emocional. Creemos que el bienestar se cultiva con paciencia, como un jardín: un día a la vez, con amabilidad hacia uno mismo.
          </p>
        </section>
      </main>

      <footer className={estilos.pie}>
        <p className={estilos.version}>
          <Icono nombre="hoja" tamano={16} />
          Versión Piloto Cerrada — Facultad de Ingeniería de Sistemas
        </p>
        <p className={estilos.derechos}>© 2026 Treeve. Todos los derechos reservados.</p>
      </footer>
    </>
  )
}
