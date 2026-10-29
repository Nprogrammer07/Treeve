// El token del enlace de recuperación equivale a una contraseña de un solo uso (HU-03b):
// no se escribe en consola, ni en logs, ni en analítica, y no se guarda en ningún almacenamiento del navegador.
// Vive solo en esta variable, en memoria, y se borra de la barra de direcciones en cuanto se lee.

/** undefined = todavía no se leyó la dirección. null = la dirección no traía token. */
let guardado: string | null | undefined

/**
 * Lee el token de la dirección UNA sola vez y la limpia (history.replaceState) para que no quede en el historial
 * ni en capturas. Es idempotente: volver a llamarla devuelve el mismo token, aunque la dirección ya esté limpia.
 */
export function leerTokenDeLaDireccion(): string | null {
  if (guardado === undefined) {
    const token = new URLSearchParams(window.location.search).get('token')
    guardado = token !== null && token.trim() !== '' ? token : null
    if (window.location.search !== '') window.history.replaceState(window.history.state, '', window.location.pathname)
  }
  return guardado
}

/** Olvida el token: se usa cuando ya se gastó o cuando la API dijo que no sirve. */
export function olvidarToken(): void {
  guardado = null
}

/** Para volver a leer la dirección desde cero (solo lo necesitan las pruebas, entre un caso y otro). */
export function reiniciarLecturaDelToken(): void {
  guardado = undefined
}
