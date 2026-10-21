import type { ReactNode } from 'react'
import { EspacioVerde } from '../../scene/EspacioVerde.tsx'
import { Boton } from '../../shared/ui/Boton.tsx'
import { Icono, type NombreIcono } from '../../shared/ui/Icono.tsx'
import estilos from './PaginaVisitante.module.css'

export type ModoDeAcceso = 'registro' | 'login'

interface Props {
  /** Las features no se importan entre sí: app/ entrega el formulario de acceso (registro o login) y el selector de sonido. */
  acceso: ReactNode
  controlesSonido: ReactNode
  /** HU-01: accesos visibles a "Iniciar sesión" y "Registrarse". app/ decide qué formulario mostrar. */
  onElegirAcceso: (modo: ModoDeAcceso) => void
  /** Mientras no exista el panel de staff (HU-10), el botón queda desactivado. */
  onAccesoStaff?: () => void
  mostrarMetricas?: boolean
}

const PASOS: { icono: NombreIcono; titulo: string; texto: string }[] = [
  { icono: 'chispas', titulo: 'Escribe cómo te sientes', texto: 'Un diario seguro y privado para desahogarte sin juicios, a tu ritmo.' },
  { icono: 'hoja', titulo: 'Riega tus hábitos', texto: 'Cada pequeño logro diario hace brotar nuevas hojas en tu terrario.' },
  { icono: 'altavoz', titulo: 'Respira y relájate', texto: 'Acompaña tus momentos con sonidos de la naturaleza que calman la mente.' },
]

const ESTADISTICAS: { icono: NombreIcono; nombre: string; valor: string }[] = [
  { icono: 'hoja', nombre: 'Plantas', valor: '12' },
  { icono: 'gota', nombre: 'Racha', valor: '7 días' },
  { icono: 'chispas', nombre: 'Flores', valor: '3' },
]

/** HU-01: página de visitante. Muestra qué es Treeve e invita a registrarse. */
export function PaginaVisitante({ acceso, controlesSonido, onElegirAcceso, onAccesoStaff, mostrarMetricas = false }: Props) {
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
            <Boton variante="suave" onClick={onAccesoStaff} disabled={!onAccesoStaff} className={estilos.staff}>
              <Icono nombre="candado" tamano={18} />
              Acceso Staff / Admins
            </Boton>
          </nav>
        </div>
      </header>

      <main id="inicio" className={estilos.principal}>
        <section className={estilos.heroe}>
          <div className={estilos.presentacion}>
            <p className={estilos.pildora}>
              <Icono nombre="hoja" tamano={16} />
              Bienestar emocional y hábitos
            </p>
            <h1 className={estilos.titulo}>Cultiva tu paz interior</h1>
            <p className={estilos.lema}>Desahógate expresando tus emociones y observa cómo tu mundo verde crece y florece en Treeve.</p>
            {controlesSonido}
            <a href="#acceso" onClick={() => onElegirAcceso('registro')} className={estilos.llamado}>
              Empieza a escribir
            </a>
          </div>
          <div id="acceso">{acceso}</div>
        </section>

        <section aria-labelledby="titulo-vista-previa" className={estilos.vistaPrevia}>
          <div className={estilos.escena}>
            <EspacioVerde etapa="arbol" pajaros mostrarMetricas={mostrarMetricas} />
            <p className={estilos.insignia}>
              <span className={estilos.punto} aria-hidden="true" />
              Vista previa de tu espacio verde
            </p>
          </div>
          <div className={estilos.banda}>
            <div>
              <h2 id="titulo-vista-previa" className={estilos.subtitulo}>
                Tu terrario crece contigo
              </h2>
              <p className={estilos.textoBanda}>Cada emoción que expresas y cada hábito que cumples riega una nueva planta.</p>
            </div>
            <dl className={estilos.estadisticas}>
              {ESTADISTICAS.map(({ icono, nombre, valor }) => (
                <div key={nombre} className={estilos.dato}>
                  <dt>
                    <Icono nombre={icono} tamano={14} />
                    {nombre}
                  </dt>
                  <dd>{valor}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="como-funciona" aria-labelledby="titulo-como-funciona" className={estilos.seccion}>
          <h2 id="titulo-como-funciona" className={estilos.tituloSeccion}>
            Cómo funciona
          </h2>
          <ol className={estilos.pasos}>
            {PASOS.map(({ icono, titulo, texto }, i) => (
              <li key={titulo} className={estilos.paso}>
                <span className={estilos.iconoPaso}>
                  <Icono nombre={icono} tamano={22} />
                </span>
                <span className={estilos.numero} aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
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
