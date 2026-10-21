import { useSyncExternalStore } from 'react'
import { leerSesion, suscribirseASesion, type Sesion } from './sesion.ts'

/** La sesión actual; la pantalla se vuelve a dibujar cuando alguien inicia o cierra sesión. */
export function useSesion(): Sesion | null {
  return useSyncExternalStore(suscribirseASesion, leerSesion)
}
