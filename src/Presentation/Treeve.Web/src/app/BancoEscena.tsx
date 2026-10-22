import { useRef, useState } from 'react'
import { EspacioVerde, type ControlEspacioVerde, type EtapaArbol } from '../scene/EspacioVerde.tsx'
import { ETAPAS } from '../scene/geometria.ts'
import { Boton } from '../shared/ui/Boton.tsx'
import estilos from './BancoEscena.module.css'

/**
 * Solo desarrollo (abrir /#escena): permite probar cada etapa y el riego y leer FPS y tiempo de carga.
 * Sirve para el spike de HU-07b: la meta es ≥ 30 FPS en gama media y carga < 4 s en 10 Mbps.
 */
export function BancoEscena() {
  const escena = useRef<ControlEspacioVerde>(null)
  const [etapa, setEtapa] = useState<EtapaArbol>('arbol-adulto')
  const [pajaros, setPajaros] = useState(true)

  return (
    <main className={estilos.banco}>
      <h1 className={estilos.titulo}>Banco de pruebas de la escena</h1>
      <EspacioVerde etapa={etapa} pajaros={pajaros} ref={escena} mostrarMetricas />
      <fieldset className={estilos.grupo}>
        <legend>Etapa</legend>
        {ETAPAS.map((valor) => (
          <label key={valor} className={estilos.opcion}>
            <input type="radio" name="etapa" checked={etapa === valor} onChange={() => setEtapa(valor)} />
            {valor}
          </label>
        ))}
      </fieldset>
      <label className={estilos.opcion}>
        <input type="checkbox" checked={pajaros} onChange={(e) => setPajaros(e.target.checked)} />
        Pájaros
      </label>
      <Boton onClick={() => escena.current?.regar()}>Regar</Boton>
      <p className={estilos.meta}>Meta: ≥ 30 FPS en gama media y carga &lt; 4 s en 10 Mbps. Anota el resultado en el PR.</p>
    </main>
  )
}
