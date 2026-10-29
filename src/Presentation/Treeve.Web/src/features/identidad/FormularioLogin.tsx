import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Aviso } from '../../shared/ui/Aviso.tsx'
import { Boton } from '../../shared/ui/Boton.tsx'
import { Icono } from '../../shared/ui/Icono.tsx'
import { iniciarSesion } from './api.ts'
import { Campo } from './Campo.tsx'
import estilos from './Formularios.module.css'
import { mensajeDeError } from './mensajes.ts'
import type { ErroresLogin } from './tipos.ts'
import { validarLogin } from './validacion.ts'

interface Props {
  /** Para quien todavía no tiene cuenta. */
  onIrARegistro?: () => void
  /** HU-03b: lleva a pedir el enlace para restablecer la contraseña. Si no se entrega, el enlace no aparece. */
  onOlvidoContrasena?: () => void
  /** Aviso de éxito que llega de otra pantalla (por ejemplo, "Tu contraseña se cambió"). */
  aviso?: string
}

/**
 * HU-03a: inicio de sesión con usuario o correo. El mensaje de error lo escribe la API y no dice qué dato falló;
 * tras 5 intentos fallidos la cuenta se bloquea y la API explica cuánto falta.
 */
export function FormularioLogin({ onIrARegistro, onOlvidoContrasena, aviso = '' }: Props) {
  const base = useId()
  const formulario = useRef<HTMLFormElement>(null)
  const [datos, setDatos] = useState({ identificador: '', contrasena: '' })
  const [errores, setErrores] = useState<ErroresLogin>({})
  const [enviando, setEnviando] = useState(false)
  const [falloEnvio, setFalloEnvio] = useState<string | null>(null)

  useEffect(() => {
    formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [errores])

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const solicitud = { identificador: datos.identificador.trim(), contrasena: datos.contrasena }
    const encontrados = validarLogin(solicitud)
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) return

    setEnviando(true)
    setFalloEnvio(null)
    try {
      // Sin console.log: estos datos incluyen la contraseña.
      await iniciarSesion(solicitud)
    } catch (error) {
      setFalloEnvio(mensajeDeError(error, 'No pudimos iniciar sesión. Inténtalo de nuevo en un momento.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form ref={formulario} onSubmit={enviar} noValidate className={estilos.tarjeta} aria-labelledby={`${base}-titulo`}>
      <p className={estilos.pildora}>
        <Icono nombre="hoja" tamano={16} />
        Iniciar sesión
      </p>
      <h2 id={`${base}-titulo`} className={estilos.titulo}>
        Qué bueno verte de nuevo
      </h2>
      <p className={estilos.subtitulo}>Entra con tu usuario o tu correo</p>

      <output className={estilos.exito}>{aviso}</output>
      <Campo id={`${base}-identificador`} etiqueta="Usuario o correo" marca="obligatorio" autoComplete="username" valor={datos.identificador} onCambio={(identificador) => setDatos((previo) => ({ ...previo, identificador }))} error={errores.identificador} />
      <Campo id={`${base}-contrasena`} etiqueta="Contraseña" marca="obligatorio" type="password" autoComplete="current-password" valor={datos.contrasena} onCambio={(contrasena) => setDatos((previo) => ({ ...previo, contrasena }))} error={errores.contrasena} />

      {onOlvidoContrasena && (
        <p className={estilos.olvido}>
          <button type="button" className={estilos.enlace} onClick={onOlvidoContrasena}>
            ¿Olvidaste tu contraseña?
          </button>
        </p>
      )}
      {falloEnvio && <Aviso>{falloEnvio}</Aviso>}
      <Boton type="submit" disabled={enviando} className={estilos.enviar}>
        Iniciar sesión
      </Boton>
      {onIrARegistro && (
        <p className={estilos.cambio}>
          ¿Aún no tienes cuenta?{' '}
          <button type="button" className={estilos.enlace} onClick={onIrARegistro}>
            Regístrate
          </button>
        </p>
      )}
    </form>
  )
}
