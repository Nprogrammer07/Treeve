// Sesión de la persona en este navegador (ADR-005): el token vive en memoria y en sessionStorage.
// Es equivalente a una contraseña: no se escribe en consola, en logs ni en la URL.

export interface Sesion {
  usuarioId: string
  apodo: string
  token: string
  expiraEn: string
}

const CLAVE = 'treeve.sesion'
const oyentes = new Set<() => void>()
let actual: Sesion | null = null
let cargada = false

function esSesion(valor: unknown): valor is Sesion {
  if (typeof valor !== 'object' || valor === null) return false
  const s = valor as Record<string, unknown>
  return (
    typeof s.usuarioId === 'string' &&
    typeof s.apodo === 'string' &&
    typeof s.token === 'string' &&
    typeof s.expiraEn === 'string'
  )
}

function vigente(sesion: Sesion): boolean {
  return new Date(sesion.expiraEn).getTime() > Date.now()
}

function avisar(): void {
  for (const oyente of oyentes) oyente()
}

function quitarDelAlmacenamiento(): void {
  try {
    window.sessionStorage.removeItem(CLAVE)
  } catch {
    // Sin almacenamiento disponible: la sesión solo vive en memoria.
  }
}

function cargar(): void {
  if (cargada) return
  cargada = true
  try {
    const crudo = window.sessionStorage.getItem(CLAVE)
    const leida: unknown = crudo ? JSON.parse(crudo) : null
    actual = esSesion(leida) && vigente(leida) ? leida : null
    if (!actual) quitarDelAlmacenamiento()
  } catch {
    actual = null
  }
}

/** La sesión vigente, o null si no hay. Recupera la de esta pestaña si se recargó la página. */
export function leerSesion(): Sesion | null {
  cargar()
  return actual
}

export function obtenerToken(): string | null {
  const sesion = leerSesion()
  if (sesion && !vigente(sesion)) {
    borrarSesion()
    return null
  }
  return sesion?.token ?? null
}

export function guardarSesion(sesion: Sesion): void {
  const { usuarioId, apodo, token, expiraEn } = sesion
  actual = { usuarioId, apodo, token, expiraEn }
  cargada = true
  try {
    window.sessionStorage.setItem(CLAVE, JSON.stringify(actual))
  } catch {
    // Sin almacenamiento disponible: la sesión solo vive en memoria y se pierde al recargar.
  }
  avisar()
}

/** Olvida el token en este navegador. No revoca la sesión en el servidor (el cierre de sesión es una historia futura). */
export function borrarSesion(): void {
  actual = null
  cargada = true
  quitarDelAlmacenamiento()
  avisar()
}

export function suscribirseASesion(oyente: () => void): () => void {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}
