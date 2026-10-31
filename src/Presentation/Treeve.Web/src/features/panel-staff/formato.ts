const NUMERO = new Intl.NumberFormat('es-CO')

/** 1240 → "1.240". */
export function formatearNumero(valor: number): string {
  return NUMERO.format(valor)
}

export function porcentaje(parte: number, total: number): number {
  return total === 0 ? 0 : Math.round((parte / total) * 100)
}

/** Los identificadores de la API son largos: la tabla muestra los primeros caracteres; el detalle, el completo. */
export function codigoCorto(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id
}
