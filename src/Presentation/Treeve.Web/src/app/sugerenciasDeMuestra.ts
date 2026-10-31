// SOLO PARA DESARROLLO (abrir /#staff). Sugerencias inventadas para ver y probar el panel con mucho volumen.
// No contienen datos reales ni, por supuesto, texto de desahogos.
// OJO: esta fuente de muestra ofrece más de lo que la API real ofrece hoy (el resumen con cifras):
// sirve para revisar el diseño completo, no para reflejar el estado actual del backend.
import type { CambiosDeSugerencia, ConsultaSugerencias, EstadoSugerencia, FuenteDeSugerencias, PaginaDeSugerencias, ResultadoDeGestion, ResumenSugerencias, Sugerencia } from '../features/panel-staff/tipos.ts'

const USUARIOS = ['trebol65', 'olivo82', 'musgo39', 'girasol10', 'jacinto95', 'arce34', 'raiz.serena13', 'amapola45']
const IDEAS = [
  'Poder descargar mis entradas en PDF para compartirlas con mi terapeuta.',
  'Una notificación opcional que me recuerde escribir cuando tenga un rato tranquilo.',
  'Agregar lluvia suave sobre hojas y tormenta lejana como opciones nuevas.',
  'Poder grabar un audio cuando no tengo ganas de escribir.',
  'Ver un calendario con los días en que me desahogué.',
  'Un modo noche con colores todavía más suaves.',
]

/** 1.240 en total, con 42 pendientes, 18 en revisión y 1.137 implementadas. */
export function crearSugerenciasDeMuestra(cantidad = 1240): Sugerencia[] {
  const estados: EstadoSugerencia[] = []
  const reparto: [EstadoSugerencia, number][] = [
    ['pendiente', 42],
    ['en_revision', 18],
    ['implementada', 1137],
  ]
  for (const [estado, veces] of reparto) estados.push(...Array<EstadoSugerencia>(veces).fill(estado))
  while (estados.length < cantidad) estados.push('rechazada')

  const base = Date.parse('2026-10-16T17:00:00Z')
  return Array.from({ length: cantidad }, (_, i) => ({
    id: `SUG-${cantidad - i}`,
    usuario: USUARIOS[i % USUARIOS.length] ?? 'trebol65',
    fecha: new Date(base - Math.floor(i / 8) * 86_400_000 - (i % 8) * 3_600_000).toISOString(),
    texto: IDEAS[i % IDEAS.length] ?? '',
    estado: estados[i] ?? 'rechazada',
  }))
}

function coincide(sugerencia: Sugerencia, consulta: ConsultaSugerencias): boolean {
  const dia = sugerencia.fecha.slice(0, 10)
  return (
    (!consulta.estado || sugerencia.estado === consulta.estado) &&
    (!consulta.usuario || sugerencia.usuario.toLowerCase() === consulta.usuario.toLowerCase()) &&
    (!consulta.desde || dia >= consulta.desde) &&
    (!consulta.hasta || dia <= consulta.hasta)
  )
}

/** Hace en memoria lo que hace el servidor: filtrar, ordenar, paginar, contar y gestionar (estado y comentario). */
export function crearFuenteDeMuestra(inicial: Sugerencia[] = crearSugerenciasDeMuestra(), retardoMs = 150): FuenteDeSugerencias {
  let todas = inicial
  const esperar = <T,>(valor: T) => new Promise<T>((resolver) => setTimeout(() => resolver(valor), retardoMs))

  return {
    consultar(consulta): Promise<PaginaDeSugerencias> {
      const masReciente = (a: Sugerencia, b: Sugerencia) => b.fecha.localeCompare(a.fecha)
      const ordenar: Record<NonNullable<ConsultaSugerencias['orden']>, (a: Sugerencia, b: Sugerencia) => number> = {
        recientes: masReciente,
        antiguas: (a, b) => a.fecha.localeCompare(b.fecha),
        usuario: (a, b) => a.usuario.localeCompare(b.usuario) || masReciente(a, b),
      }
      const filtradas = todas.filter((s) => coincide(s, consulta)).sort(ordenar[consulta.orden ?? 'recientes'])
      const items = filtradas.slice(consulta.desplazamiento, consulta.desplazamiento + consulta.limite)
      return esperar({ items, hayMas: consulta.desplazamiento + consulta.limite < filtradas.length })
    },
    resumen(): Promise<ResumenSugerencias> {
      const contar = (estado: EstadoSugerencia) => todas.filter((s) => s.estado === estado).length
      return esperar({ total: todas.length, pendientes: contar('pendiente'), enRevision: contar('en_revision'), implementadas: contar('implementada'), rechazadas: contar('rechazada') })
    },
    actualizar(id: string, cambios: CambiosDeSugerencia): Promise<ResultadoDeGestion> {
      const actual = todas.find((s) => s.id === id)
      if (!actual) return Promise.reject(new Error('No existe esa sugerencia'))
      const estado = cambios.estado ?? actual.estado
      // Como la API: sin comentario no cambia; "" lo quita.
      const comentario = cambios.comentario === undefined ? actual.comentario : cambios.comentario.trim() || undefined
      if (estado === actual.estado && comentario === actual.comentario) return esperar({ huboCambios: false })
      const { comentario: _anterior, ...resto } = actual
      const nueva: Sugerencia = { ...resto, estado, ...(comentario ? { comentario } : {}), gestionadaEn: new Date().toISOString() }
      todas = todas.map((s) => (s.id === id ? nueva : s))
      return esperar({ huboCambios: true })
    },
  }
}
