import type { ErroresLogin, ErroresRegistro, LoginRequest, RegistroRequest } from './tipos.ts'

// Ayudas de UX que reflejan las reglas de la API (docs/guias/api-identidad.md).
// Quien decide es el backend, que siempre vuelve a validar.
export const LIMITES = {
  nombreCompleto: { min: 2, max: 100 },
  apodo: { min: 2, max: 30 },
  nombreDeUsuario: { min: 3, max: 30 },
  contrasena: { min: 8, max: 128 },
  motivoDeRegistro: { max: 500 },
} as const

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Igual que ReglasDeIdentidad del backend: el usuario se pasa a minúsculas y luego debe cumplir [a-z0-9._-].
// Por eso "Ana" vale (se guarda como "ana"), pero "josé" o "ñandú" no: las tildes y la ñ no están permitidas.
const USUARIO = /^[a-z0-9._-]+$/

const fueraDeRango = (texto: string, { min, max }: { min: number; max: number }) => texto.length < min || texto.length > max

export function validarRegistro(datos: RegistroRequest): ErroresRegistro {
  const errores: ErroresRegistro = {}
  const nombre = datos.nombreCompleto.trim()
  const apodo = datos.apodo.trim()
  const usuario = datos.nombreDeUsuario.trim().toLowerCase()
  const { contrasena } = datos

  if (fueraDeRango(nombre, LIMITES.nombreCompleto)) {
    errores.nombreCompleto = `Escribe tu nombre completo (de ${LIMITES.nombreCompleto.min} a ${LIMITES.nombreCompleto.max} caracteres).`
  }
  if (fueraDeRango(apodo, LIMITES.apodo)) {
    errores.apodo = `Elige un apodo de ${LIMITES.apodo.min} a ${LIMITES.apodo.max} caracteres.`
  }
  if (fueraDeRango(usuario, LIMITES.nombreDeUsuario) || !USUARIO.test(usuario)) {
    errores.nombreDeUsuario = `El usuario debe tener de ${LIMITES.nombreDeUsuario.min} a ${LIMITES.nombreDeUsuario.max} caracteres: letras sin tildes ni ñ, números, punto, guion o guion bajo.`
  }
  if (datos.correo && datos.correo.trim() !== '' && !CORREO.test(datos.correo.trim())) {
    errores.correo = 'Escribe un correo válido o déjalo vacío.'
  }
  if (fueraDeRango(contrasena, LIMITES.contrasena) || !/\p{L}/u.test(contrasena) || !/\p{Nd}/u.test(contrasena)) {
    errores.contrasena = `La contraseña debe tener de ${LIMITES.contrasena.min} a ${LIMITES.contrasena.max} caracteres, con al menos una letra y un número.`
  }
  return errores
}

export function validarLogin(datos: LoginRequest): ErroresLogin {
  const errores: ErroresLogin = {}
  if (datos.identificador.trim() === '') errores.identificador = 'Escribe tu usuario o tu correo.'
  if (datos.contrasena === '') errores.contrasena = 'Escribe tu contraseña.'
  return errores
}
