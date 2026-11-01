import { useId, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../shared/api/clienteApi.ts'
import { Aviso } from '../../shared/ui/Aviso.tsx'
import { Boton } from '../../shared/ui/Boton.tsx'
import estilos from './PanelAdministracion.module.css'
import type { CambioDeRol } from './tipos.ts'

interface Props {
  ascender: (nombreDeUsuario: string) => Promise<CambioDeRol>
  /** Se llamó con éxito: el panel vuelve a pedir el equipo y los registros. */
  onAscendida: () => void
}

/**
 * HU-12: ascender a staff por nombre de usuario exacto. Lo valida el backend (existe, no es ya staff, no es administración);
 * esta pantalla muestra su mensaje tal cual. No hay buscador ni lista de todas las personas: la API no los ofrece.
 */
export function AscenderAStaff({ ascender, onAscendida }: Props) {
  const idUsuario = useId()
  const [usuario, setUsuario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [exito, setExito] = useState('')
  const [fallo, setFallo] = useState<string | null>(null)

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setEnviando(true)
    setExito('')
    setFallo(null)
    try {
      const resultado = await ascender(usuario.trim())
      setExito(`${resultado.usuario} ahora forma parte del staff.`)
      setUsuario('')
      onAscendida()
    } catch (error) {
      setFallo(error instanceof ErrorApi && error.mensajeParaUsuario ? error.mensajeParaUsuario : 'No pudimos ascender a esta persona. Inténtalo de nuevo en un momento.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section aria-labelledby={`${idUsuario}-titulo`} className={estilos.tarjeta}>
      <h2 id={`${idUsuario}-titulo`} className={estilos.tituloTarjeta}>
        Añadir a alguien al staff
      </h2>
      <p className={estilos.texto}>Escribe el nombre de usuario exacto de la persona. Recibirá un aviso y podrá entrar al panel de staff.</p>
      <form onSubmit={enviar} className={estilos.formularioAscender}>
        <div className={estilos.campo}>
          <label htmlFor={idUsuario} className={estilos.etiqueta}>
            Nombre de usuario
          </label>
          <input id={idUsuario} className={estilos.entrada} type="text" autoComplete="off" placeholder="por ejemplo, ana.l" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
        </div>
        <Boton type="submit" disabled={enviando || usuario.trim() === ''}>
          Ascender a staff
        </Boton>
      </form>
      <output className={estilos.exito}>{exito}</output>
      {fallo && <Aviso>{fallo}</Aviso>}
    </section>
  )
}
