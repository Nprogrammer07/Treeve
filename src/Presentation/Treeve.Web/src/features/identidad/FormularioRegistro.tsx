import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Aviso } from '../../shared/ui/Aviso.tsx'
import { Boton } from '../../shared/ui/Boton.tsx'
import { Icono } from '../../shared/ui/Icono.tsx'
import { registrar } from './api.ts'
import { Campo } from './Campo.tsx'
import estilos from './Formularios.module.css'
import { mensajeDeError } from './mensajes.ts'
import type { ErroresRegistro, RegistroRequest } from './tipos.ts'
import { LIMITES, validarRegistro } from './validacion.ts'

interface Props {
  /** Para quien ya tiene cuenta. */
  onIrALogin?: () => void
}

const VACIO = { nombreCompleto: '', apodo: '', nombreDeUsuario: '', correo: '', contrasena: '', motivoDeRegistro: '' }

/**
 * HU-02: registro con los datos mínimos. Valida para la experiencia; el backend siempre vuelve a validar.
 * Al registrarse queda la sesión abierta (acceso automático): la app lo nota por el estado de la sesión.
 */
export function FormularioRegistro({ onIrALogin }: Props) {
  const base = useId()
  const formulario = useRef<HTMLFormElement>(null)
  const [datos, setDatos] = useState(VACIO)
  const [errores, setErrores] = useState<ErroresRegistro>({})
  const [enviando, setEnviando] = useState(false)
  const [falloEnvio, setFalloEnvio] = useState<string | null>(null)

  useEffect(() => {
    formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [errores])

  const poner = (campo: keyof typeof VACIO) => (valor: string) => setDatos((previo) => ({ ...previo, [campo]: valor }))

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const solicitud: RegistroRequest = {
      nombreCompleto: datos.nombreCompleto.trim(),
      apodo: datos.apodo.trim(),
      nombreDeUsuario: datos.nombreDeUsuario.trim(),
      contrasena: datos.contrasena,
      ...(datos.correo.trim() && { correo: datos.correo.trim() }),
      ...(datos.motivoDeRegistro.trim() && { motivoDeRegistro: datos.motivoDeRegistro.trim() }),
    }
    const encontrados = validarRegistro(solicitud)
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) return

    setEnviando(true)
    setFalloEnvio(null)
    try {
      // Sin console.log: estos datos incluyen la contraseña.
      await registrar(solicitud)
    } catch (error) {
      setFalloEnvio(mensajeDeError(error, 'No pudimos crear tu cuenta. Inténtalo de nuevo en un momento.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form ref={formulario} onSubmit={enviar} noValidate className={estilos.tarjeta} aria-labelledby={`${base}-titulo`}>
      <p className={estilos.pildora}>
        <Icono nombre="chispas" tamano={16} />
        Registro Rápido
      </p>
      <h2 id={`${base}-titulo`} className={estilos.titulo}>
        Únete a la Comunidad Treeve
      </h2>
      <p className={estilos.subtitulo}>Registro rápido y sin complicaciones</p>

      <Campo id={`${base}-nombre`} etiqueta="Nombre completo" marca="obligatorio" placeholder="Ej. Ana María López" autoComplete="name" valor={datos.nombreCompleto} onCambio={poner('nombreCompleto')} error={errores.nombreCompleto} />
      <div className={estilos.fila}>
        <Campo id={`${base}-apodo`} etiqueta="Apodo" marca="obligatorio" placeholder="Ej. hojita" autoComplete="nickname" valor={datos.apodo} onCambio={poner('apodo')} error={errores.apodo} />
        <Campo id={`${base}-usuario`} etiqueta="Usuario" marca="obligatorio" placeholder="Ej. ana.l" autoComplete="username" valor={datos.nombreDeUsuario} onCambio={poner('nombreDeUsuario')} error={errores.nombreDeUsuario} />
      </div>
      <Campo id={`${base}-correo`} etiqueta="Correo electrónico" marca="opcional" type="email" placeholder="tu@correo.com" autoComplete="email" ayuda="Solo sirve para recuperar tu contraseña." valor={datos.correo} onCambio={poner('correo')} error={errores.correo} />
      <Campo id={`${base}-contrasena`} etiqueta="Contraseña" marca="obligatorio" type="password" autoComplete="new-password" ayuda={`De ${LIMITES.contrasena.min} caracteres o más, con al menos una letra y un número.`} valor={datos.contrasena} onCambio={poner('contrasena')} error={errores.contrasena} />
      <Campo id={`${base}-motivo`} etiqueta="¿Por qué decidiste instalarte Treeve?" marca="opcional" multilinea maxLength={LIMITES.motivoDeRegistro.max} placeholder="Cuéntanos un poco, si quieres..." valor={datos.motivoDeRegistro} onCambio={poner('motivoDeRegistro')} />

      {falloEnvio && <Aviso>{falloEnvio}</Aviso>}
      <Boton type="submit" disabled={enviando} className={estilos.enviar}>
        Registrarme gratis
      </Boton>
      {onIrALogin && (
        <p className={estilos.cambio}>
          ¿Ya tienes cuenta?{' '}
          <button type="button" className={estilos.enlace} onClick={onIrALogin}>
            Inicia sesión
          </button>
        </p>
      )}
    </form>
  )
}
