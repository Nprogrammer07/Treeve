// Preferencia de interfaz (no es contenido de un desahogo): solo el volumen.
const CLAVE = 'treeve.volumen'
const POR_DEFECTO = 0.6

export function leerVolumen(): number {
  try {
    const valor = Number(window.localStorage.getItem(CLAVE))
    return Number.isFinite(valor) && valor > 0 && valor <= 1 ? valor : POR_DEFECTO
  } catch {
    return POR_DEFECTO
  }
}

export function guardarVolumen(volumen: number): void {
  try {
    window.localStorage.setItem(CLAVE, String(volumen))
  } catch {
    // Sin almacenamiento disponible: el volumen simplemente no se recuerda.
  }
}
