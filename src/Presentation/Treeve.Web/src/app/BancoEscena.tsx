import { useRef, useState } from 'react'
import { EspacioVerde, type ControlEspacioVerde, type EtapaArbol } from '../scene/EspacioVerde.tsx'
import { ETAPAS, NIVEL_MAXIMO } from '../scene/geometria.ts'
import { Boton } from '../shared/ui/Boton.tsx'
import estilos from './BancoEscena.module.css'

const NIVELES = Array.from({ length: NIVEL_MAXIMO }, (_, i) => i + 1)

/**
 * Solo desarrollo (abrir /#escena): permite probar cada etapa del árbol, cada nivel de flores y de bosque, el riego y el
 * crecimiento, y leer FPS y tiempo de carga. Sirve para el spike de HU-07b: la meta es ≥ 30 FPS en gama media y carga < 4 s en 10 Mbps.
 */
export function BancoEscena() {
  const escena = useRef<ControlEspacioVerde>(null)
  const [etapa, setEtapa] = useState<EtapaArbol>('arbol-adulto')
  const [nivelFlores, setNivelFlores] = useState(NIVEL_MAXIMO)
  const [nivelBosque, setNivelBosque] = useState(NIVEL_MAXIMO)
  const [pajaros, setPajaros] = useState(true)

  return (
    <main className={estilos.banco}>
      <h1 className={estilos.titulo}>Banco de pruebas de la escena</h1>
      <EspacioVerde etapa={etapa} nivelFlores={nivelFlores} nivelBosque={nivelBosque} pajaros={pajaros} ref={escena} mostrarMetricas />
      <fieldset className={estilos.grupo}>
        <legend>Árbol (etapa)</legend>
        {ETAPAS.map((valor) => (
          <label key={valor} className={estilos.opcion}>
            <input type="radio" name="etapa" checked={etapa === valor} onChange={() => setEtapa(valor)} />
            {valor}
          </label>
        ))}
      </fieldset>
      <fieldset className={estilos.grupo}>
        <legend>Nivel de las flores</legend>
        {NIVELES.map((nivel) => (
          <label key={nivel} className={estilos.opcion}>
            <input type="radio" name="flores" checked={nivelFlores === nivel} onChange={() => setNivelFlores(nivel)} />
            {nivel}
          </label>
        ))}
      </fieldset>
      <fieldset className={estilos.grupo}>
        <legend>Nivel del bosque</legend>
        {NIVELES.map((nivel) => (
          <label key={nivel} className={estilos.opcion}>
            <input type="radio" name="bosque" checked={nivelBosque === nivel} onChange={() => setNivelBosque(nivel)} />
            {nivel}
          </label>
        ))}
      </fieldset>
      <label className={estilos.opcion}>
        <input type="checkbox" checked={pajaros} onChange={(e) => setPajaros(e.target.checked)} />
        Pájaros
      </label>
      <div className={estilos.grupo}>
        <Boton onClick={() => escena.current?.regar()}>Regar</Boton>
        <Boton onClick={() => escena.current?.crecer()}>Crecer</Boton>
      </div>
      <p className={estilos.meta}>Meta: ≥ 30 FPS en gama media y carga &lt; 4 s en 10 Mbps. Anota el resultado en el PR.</p>
    </main>
  )
}
