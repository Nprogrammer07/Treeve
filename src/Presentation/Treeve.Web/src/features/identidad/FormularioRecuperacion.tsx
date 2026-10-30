import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Aviso } from '../../shared/ui/Aviso.tsx'
import { Boton } from '../../shared/ui/Boton.tsx'
import { Icono } from '../../shared/ui/Icono.tsx'
import { solicitarRecuperacion } from './api.ts'
import { Campo } from './Campo.tsx'
import estilos from './Formularios.module.css'
import { mensajeDeError } from './mensajes.ts'

interface Props {
  onVolver: () => void
  /** Cuánto queda desactivado el botón después de enviar. La API ya limita a un correo cada 2 minutos por cuenta. */
  esperaMs?: number
}

/**
 * HU-03b, pantalla 1: pedir el enlace para restablecer la contraseña.
 * Si la API responde 202, se muestra SIEMPRE su mensaje y nada más: la respuesta es idéntica exista o no el correo,
 * así que la interfaz nunca dice "correo enviado" ni "correo no encontrado".
 */
export function FormularioRecuperacion({ onVolver, esperaMs = 10_000 }: Props) {
  const base = useId()
  const [correo, setCorreo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enfriando, setEnfriando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [fallo, setFallo] = useState<string | null>(null)
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(temporizador.current), [])

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setEnviando(true)
    setMensaje('')
    setFallo(null)
    try {
      // Sin console.log: el correo es un dato personal.
      const respuesta = await solicitarRecuperacion({ correo: correo.trim() })
      setMensaje(respuesta.mensaje)
    } catch (error) {
      setFallo(mensajeDeError(error, 'No pudimos enviar la solicitud. Inténtalo de nuevo en un momento.'))
    } finally {
      setEnviando(false)
      setEnfriando(true)
      temporizador.current = setTimeout(() => setEnfriando(false), esperaMs)
    }
  }

  return (
    <form onSubmit={enviar} noValidate className={estilos.tarjeta} aria-labelledby={`${base}-titulo`}>
      <p className={estilos.pildora}>
        <Icono nombre="hoja" tamano={16} />
        Recuperar contraseña
      </p>
      <h2 id={`${base}-titulo`} className={estilos.titulo}>
        ¿Olvidaste tu contraseña?
      </h2>
      <p className={estilos.subtitulo}>Escribe el correo de tu cuenta y te enviaremos un enlace para elegir una nueva.</p>

      <Campo
        id={`${base}-correo`}
        etiqueta="Correo electrónico"
        marca="obligatorio"
        type="email"
        autoComplete="email"
        placeholder="tu@correo.com"
        ayuda="Solo sirve si registraste un correo en tu cuenta."
        valor={correo}
        onCambio={setCorreo}
      />

      <output className={estilos.exito}>{mensaje}</output>
      {fallo && <Aviso>{fallo}</Aviso>}
      <Boton type="submit" disabled={enviando || enfriando || correo.trim() === ''} className={estilos.enviar}>
        Enviar enlace
      </Boton>
      <p className={estilos.cambio}>
        <button type="button" className={estilos.enlace} onClick={onVolver}>
          Volver a iniciar sesión
        </button>
      </p>
    </form>
  )
}
