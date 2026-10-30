import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { ErrorApi } from '../../shared/api/clienteApi.ts'
import { borrarSesion } from '../../shared/api/sesion.ts'
import { Aviso } from '../../shared/ui/Aviso.tsx'
import { Boton } from '../../shared/ui/Boton.tsx'
import { Icono } from '../../shared/ui/Icono.tsx'
import { restablecerContrasena } from './api.ts'
import { Campo } from './Campo.tsx'
import estilos from './Formularios.module.css'
import { mensajeDeError } from './mensajes.ts'
import pagina from './RestablecerContrasena.module.css'
import { leerTokenDeLaDireccion, olvidarToken } from './tokenDeRecuperacion.ts'
import type { ErroresRestablecer } from './tipos.ts'
import { LIMITES, validarContrasenaNueva } from './validacion.ts'

interface Props {
  /** La contraseña cambió: app/ lleva a "Iniciar sesión" con un aviso de éxito. */
  onRestablecida: () => void
  /** El enlace no sirve: app/ lleva a la pantalla para pedir uno nuevo. */
  onPedirEnlace: () => void
}

type Vista = { tipo: 'formulario'; token: string } | { tipo: 'invalido'; mensaje: string }

const ENLACE_INVALIDO = 'El enlace no es válido o ya venció. Pide uno nuevo.'

/**
 * HU-03b, pantalla 2 (/restablecer-contrasena): elegir la contraseña nueva con el enlace del correo.
 * El token se lee una vez, se borra de la barra de direcciones y vive solo en memoria. Nunca se escribe en consola ni en logs.
 */
export function RestablecerContrasena({ onRestablecida, onPedirEnlace }: Props) {
  const base = useId()
  const [vista, setVista] = useState<Vista>(() => {
    const token = leerTokenDeLaDireccion()
    return token === null ? { tipo: 'invalido', mensaje: ENLACE_INVALIDO } : { tipo: 'formulario', token }
  })

  if (vista.tipo === 'invalido') {
    return (
      <main className={pagina.pagina}>
        <div className={estilos.tarjeta}>
          <h1 className={estilos.titulo}>El enlace no es válido</h1>
          <p className={estilos.subtitulo}>{vista.mensaje}</p>
          <Boton onClick={onPedirEnlace} className={estilos.enviar}>
            Pedir un enlace nuevo
          </Boton>
        </div>
      </main>
    )
  }

  return (
    <main className={pagina.pagina}>
      <Formulario
        base={base}
        token={vista.token}
        onRestablecida={onRestablecida}
        onTokenInvalido={(mensaje) => {
          olvidarToken()
          setVista({ tipo: 'invalido', mensaje })
        }}
      />
    </main>
  )
}

interface PropsFormulario {
  base: string
  token: string
  onRestablecida: () => void
  onTokenInvalido: (mensaje: string) => void
}

function Formulario({ base, token, onRestablecida, onTokenInvalido }: PropsFormulario) {
  const formulario = useRef<HTMLFormElement>(null)
  const [contrasena, setContrasena] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [errores, setErrores] = useState<ErroresRestablecer>({})
  const [enviando, setEnviando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)

  useEffect(() => {
    formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [errores])

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const encontrados = validarContrasenaNueva(contrasena, confirmacion)
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) return

    setEnviando(true)
    setFallo(null)
    try {
      // Sin console.log: aquí viajan el token y la contraseña.
      await restablecerContrasena({ token, contrasena })
      // Al cambiar la contraseña la API cierra todas las sesiones, también la actual: se olvida la sesión local.
      borrarSesion()
      olvidarToken()
      onRestablecida()
    } catch (error) {
      if (error instanceof ErrorApi && error.codigo === 'TOKEN_INVALIDO') {
        onTokenInvalido(error.mensajeParaUsuario ?? ENLACE_INVALIDO)
      } else {
        // 400 VALIDACION: la contraseña no cumple la política y el enlace NO se gastó, así que se puede reintentar.
        setFallo(mensajeDeError(error, 'No pudimos cambiar tu contraseña. Inténtalo de nuevo en un momento.'))
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form ref={formulario} onSubmit={enviar} noValidate className={estilos.tarjeta} aria-labelledby={`${base}-titulo`}>
      <p className={estilos.pildora}>
        <Icono nombre="hoja" tamano={16} />
        Recuperar contraseña
      </p>
      <h1 id={`${base}-titulo`} className={estilos.titulo}>
        Elige tu contraseña nueva
      </h1>
      <p className={estilos.subtitulo}>Úsala la próxima vez que inicies sesión.</p>

      <Campo
        id={`${base}-contrasena`}
        etiqueta="Contraseña nueva"
        marca="obligatorio"
        type="password"
        autoComplete="new-password"
        ayuda={`De ${LIMITES.contrasena.min} caracteres o más, con al menos una letra y un número.`}
        valor={contrasena}
        onCambio={setContrasena}
        error={errores.contrasena}
      />
      <Campo id={`${base}-confirmacion`} etiqueta="Confirma tu contraseña" marca="obligatorio" type="password" autoComplete="new-password" valor={confirmacion} onCambio={setConfirmacion} error={errores.confirmacion} />

      {fallo && <Aviso>{fallo}</Aviso>}
      <Boton type="submit" disabled={enviando} className={estilos.enviar}>
        Cambiar contraseña
      </Boton>
    </form>
  )
}
