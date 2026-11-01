import { useState } from 'react'
import { ErrorApi } from '../../shared/api/clienteApi.ts'
import { Aviso } from '../../shared/ui/Aviso.tsx'
import { Boton } from '../../shared/ui/Boton.tsx'
import { Dialogo } from '../../shared/ui/Dialogo.tsx'
import estilos from './PanelAdministracion.module.css'
import type { CambioDeRol, MiembroDelEquipo } from './tipos.ts'

interface Props {
  /** La persona a quien se quiere quitar del staff, o null si la ventana está cerrada. */
  miembro: MiembroDelEquipo | null
  revocar: (usuarioId: string) => Promise<CambioDeRol>
  onCerrar: () => void
  /** Se revocó con éxito: el panel vuelve a pedir el equipo y los registros. */
  onRevocada: (resultado: CambioDeRol) => void
}

/** HU-12: confirmación antes de quitar a alguien del staff. Su efecto es inmediato y deja un registro que no se puede borrar. */
export function ConfirmarRevocacion({ miembro, revocar, onCerrar, onRevocada }: Props) {
  return (
    <Dialogo abierto={miembro !== null} titulo={miembro ? `¿Quitar a ${miembro.usuario} del staff?` : ''} onCerrar={onCerrar}>
      {miembro && <Contenido key={miembro.id} miembro={miembro} revocar={revocar} onCerrar={onCerrar} onRevocada={onRevocada} />}
    </Dialogo>
  )
}

function Contenido({ miembro, revocar, onCerrar, onRevocada }: Omit<Props, 'miembro'> & { miembro: MiembroDelEquipo }) {
  const [enviando, setEnviando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)

  async function confirmar() {
    setEnviando(true)
    setFallo(null)
    try {
      onRevocada(await revocar(miembro.id))
    } catch (error) {
      // 400: no es staff, es administradora o su rol cambió mientras tanto; el mensaje de la API se muestra tal cual.
      setFallo(error instanceof ErrorApi && error.mensajeParaUsuario ? error.mensajeParaUsuario : 'No pudimos quitar a esta persona del staff. Inténtalo de nuevo en un momento.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <div className={estilos.detalle}>
        <p>Volverá a ser una persona usuaria regular desde su siguiente petición.</p>
        <p>Recibirá un aviso, y el cambio quedará en el registro de cambios de rol, que no se puede modificar ni borrar.</p>
      </div>
      {fallo && <Aviso>{fallo}</Aviso>}
      <div className={estilos.acciones}>
        <Boton variante="suave" onClick={onCerrar}>
          Cancelar
        </Boton>
        <Boton variante="tierra" disabled={enviando} onClick={() => void confirmar()}>
          Quitar del staff
        </Boton>
      </div>
    </>
  )
}
