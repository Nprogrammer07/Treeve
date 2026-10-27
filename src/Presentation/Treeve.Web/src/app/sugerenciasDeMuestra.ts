// SOLO PARA DESARROLLO (abrir /#staff). Sugerencias inventadas para ver y probar el panel antes de que exista la API.
// No contienen datos reales ni, por supuesto, texto de desahogos.
import type { CambiosDeSugerencia, ConsultaSugerencias, EstadoSugerencia, FuenteDeSugerencias, PaginaDeSugerencias, ResumenSugerencias, Sugerencia } from '../features/panel-staff/tipos.ts'

const APODOS = ['Trébol65', 'Olivo82', 'Musgo39', 'Girasol10', 'Jacinto95', 'Arce34', 'Raíz Serena13', 'Amapola45']
const IDEAS = [
  'Poder descargar mis entradas en PDF para compartirlas con mi terapeuta.',
  'Una notificación opcional que me recuerde escribir cuando tenga un rato tranquilo.',
  'Agregar lluvia suave sobre hojas y tormenta lejana como opciones nuevas.',
  'Poder grabar un audio cuando no tengo ganas de escribir.',
  'Ver un calendario con los días en que me desahogué.',
  'Un modo noche con colores todavía más suaves.',
]

/** Misma distribución que el diseño: 1.240 en total, con 42 pendientes, 18 en revisión y 1.137 implementadas. */
export function crearSugerenciasDeMuestra(cantidad = 1240): Sugerencia[] {
  const estados: EstadoSugerencia[] = []
  const reparto: [EstadoSugerencia, number][] = [
    ['pendiente', 42],
    ['en-revision', 18],
    ['implementada', 1137],
  ]
  for (const [estado, veces] of reparto) estados.push(...Array<EstadoSugerencia>(veces).fill(estado))
  while (estados.length < cantidad) estados.push('rechazada')

  const base = Date.parse('2026-10-16T17:00:00Z')
  return Array.from({ length: cantidad }, (_, i) => {
    const numero = cantidad - i
    return {
      id: `SUG-${numero}`,
      usuario: `${APODOS[i % APODOS.length] ?? 'Trébol'}`.replace(/\d+$/, '') + String((i * 7) % 100),
      fecha: new Date(base - Math.floor(i / 8) * 86_400_000 - (i % 8) * 3_600_000).toISOString(),
      texto: IDEAS[i % IDEAS.length] ?? '',
      estado: estados[i] ?? 'rechazada',
    }
  })
}

function coincide(sugerencia: Sugerencia, consulta: ConsultaSugerencias): boolean {
  const dia = sugerencia.fecha.slice(0, 10)
  const buscada = consulta.busqueda.toLowerCase()
  return (
    (consulta.estado === 'todos' || sugerencia.estado === consulta.estado) &&
    (!consulta.desde || dia >= consulta.desde) &&
    (!consulta.hasta || dia <= consulta.hasta) &&
    (buscada === '' || sugerencia.usuario.toLowerCase().includes(buscada) || sugerencia.texto.toLowerCase().includes(buscada))
  )
}

/** Hace en memoria lo que hará el servidor: filtrar, ordenar, paginar, contar y actualizar. */
export function crearFuenteDeMuestra(inicial: Sugerencia[] = crearSugerenciasDeMuestra(), retardoMs = 150): FuenteDeSugerencias {
  let todas = inicial
  const esperar = <T,>(valor: T) => new Promise<T>((resolver) => setTimeout(() => resolver(valor), retardoMs))

  return {
    consultar(consulta): Promise<PaginaDeSugerencias> {
      const filtradas = todas.filter((s) => coincide(s, consulta))
      filtradas.sort((a, b) => (consulta.orden === 'recientes' ? b.fecha.localeCompare(a.fecha) : a.fecha.localeCompare(b.fecha)))
      const desde = (consulta.pagina - 1) * consulta.tamano
      return esperar({ items: filtradas.slice(desde, desde + consulta.tamano), total: filtradas.length })
    },
    resumen(): Promise<ResumenSugerencias> {
      const contar = (estado: EstadoSugerencia) => todas.filter((s) => s.estado === estado).length
      return esperar({
        total: todas.length,
        pendientes: contar('pendiente'),
        enRevision: contar('en-revision'),
        implementadas: contar('implementada'),
        rechazadas: contar('rechazada'),
      })
    },
    actualizar(id: string, cambios: CambiosDeSugerencia): Promise<Sugerencia> {
      const actual = todas.find((s) => s.id === id)
      if (!actual) return Promise.reject(new Error('No existe esa sugerencia'))
      const nueva = { ...actual, ...cambios }
      todas = todas.map((s) => (s.id === id ? nueva : s))
      return esperar(nueva)
    },
  }
}
