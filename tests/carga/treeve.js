// TEC-05 · Prueba de carga de la API de Treeve con k6 (ADR-009). Cómo ejecutarla: tests/carga/README.md.
//
// Simula personas que entran a su espacio verde, se desahogan con pausas para escribir y miran sus avisos.
// Las metas (thresholds) son las del ADR-009: si una no se cumple, k6 termina con error.
//
// Reglas para no ensuciar datos reales (ADR-009, punto 5):
// - Todas las cuentas se llaman k6-<corrida>-<n> y escriben textos inventados, sin frases de crisis.
// - No se usan /api/staff ni /api/admin (dejarían filas en los logs de auditoría, que son inmutables)
//   ni se envían sugerencias (llegarían al panel del staff).
import http from 'k6/http'
import exec from 'k6/execution'
import { check, group, sleep } from 'k6'

const BASE_URL = (__ENV.BASE_URL || '').replace(/\/+$/, '')
if (!BASE_URL) {
  throw new Error('Falta la dirección de la API: k6 run -e BASE_URL=https://... tests/carga/treeve.js')
}

const ES_LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(BASE_URL)
if (!ES_LOCAL && __ENV.ACEPTO_DATOS_DE_PRUEBA !== 'si') {
  throw new Error(
    `La prueba crea cuentas y desahogos de prueba en ${BASE_URL}. ` +
      'Si es lo que quieres, agrega -e ACEPTO_DATOS_DE_PRUEBA=si y borra las cuentas k6-% al terminar (README).',
  )
}

/** humo: 1 persona, una vuelta, para ver que todo responde. carga: el pico de diseño. estres: más allá, para ver el límite. */
const PERFIL = __ENV.PERFIL || 'carga'
if (!['humo', 'carga', 'estres'].includes(PERFIL)) {
  throw new Error('PERFIL debe ser humo, carga o estres.')
}

/** Personas activas a la vez en el pico de diseño: el 5 % de 2000 registradas (ADR-009, punto 4). */
const PERSONAS = Number(__ENV.PERSONAS || 100)
/** Personas activas a la vez en la etapa de estrés. */
const ESTRES = Number(__ENV.ESTRES || 200)
/** Cuánto se sostiene el pico. */
const DURACION = __ENV.DURACION || '10m'
/** Inicios de sesión por segundo mientras dura el pico. Cada uno calcula un hash PBKDF2 en el servidor (ADR-005). */
const LOGINS_POR_SEGUNDO = Number(__ENV.LOGINS_POR_SEGUNDO || 1)
/** Multiplica las pausas de lectura y escritura. En el perfil de humo casi no hay pausas. */
const PAUSA = Number(__ENV.PAUSA || (PERFIL === 'humo' ? 0.02 : 1))

const MAXIMO_DE_PERSONAS = PERFIL === 'humo' ? 1 : PERFIL === 'estres' ? Math.max(PERSONAS, ESTRES) : PERSONAS

function escenarios() {
  if (PERFIL === 'humo') {
    return { persona: { executor: 'per-vu-iterations', vus: 1, iterations: 1, exec: 'persona' } }
  }

  const etapas =
    PERFIL === 'carga'
      ? [
          { duration: '2m', target: PERSONAS },
          { duration: DURACION, target: PERSONAS },
          { duration: '1m', target: 0 },
        ]
      : [
          { duration: '2m', target: PERSONAS },
          { duration: '3m', target: ESTRES },
          { duration: DURACION, target: ESTRES },
          { duration: '1m', target: 0 },
        ]

  return {
    persona: { executor: 'ramping-vus', startVUs: 0, stages: etapas, gracefulRampDown: '30s', exec: 'persona' },
    inicioDeSesion: {
      executor: 'constant-arrival-rate',
      rate: LOGINS_POR_SEGUNDO,
      timeUnit: '1s',
      startTime: '2m',
      duration: DURACION,
      preAllocatedVUs: 5,
      maxVUs: 20,
      exec: 'inicioDeSesion',
    },
  }
}

export const options = {
  scenarios: escenarios(),
  // Registrar las cuentas también calcula PBKDF2: con 200 personas puede tardar unos minutos.
  setupTimeout: '15m',
  thresholds: {
    // HU-06 y ADR-001: guardar el desahogo y recibir el mensaje de apoyo en ≤ 2 s en el 95 % de los casos.
    'http_req_duration{name:guardar_desahogo}': ['p(95)<2000'],
    // CLAUDE.md, sección 4: 0,5 s de promedio por petición en las rutas de la persona usuaria.
    'http_req_duration{meta:promedio}': ['avg<500'],
    // Menos del 1 % de peticiones fallidas.
    http_req_failed: ['rate<0.01'],
    // Sin meta propia (ADR-009): se declaran para que aparezcan en el resumen.
    'http_req_duration{name:iniciar_sesion}': ['max>=0'],
    'http_req_duration{name:registro}': ['max>=0'],
    checks: ['rate>0.99'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
}

const EMOCIONES = ['tristeza', 'rabia', 'miedo', 'duda', 'felicidad']

// Textos inventados para la prueba: sin datos reales y sin frases de crisis (no deben activar el mensaje fijo).
const TEXTOS = [
  'Hoy fue un día largo en el trabajo y necesitaba escribirlo en algún lado.',
  'Mañana tengo un parcial y siento que no estudié lo suficiente.',
  'Discutí con mi hermano por una tontería y me quedé pensando en eso toda la tarde.',
  'No sé si cambiar de carrera o seguir; le doy vueltas todos los días.',
  'Hoy salí a caminar con una amiga y me sentí muy bien, quería guardarlo.',
  'El trancón de la mañana me puso de mal genio y no se me pasó en todo el día.',
  'Me preocupa cómo voy a pagar el arriendo este mes.',
  'Mi mamá me llamó y hablamos un buen rato, me alegró la noche.',
  'Tengo una entrevista la próxima semana y me pone nerviosa pensar en eso.',
  'Hoy terminé por fin el proyecto que llevaba semanas haciendo.',
]

const elegir = (lista) => lista[Math.floor(Math.random() * lista.length)]
const pausa = (minimo, maximo) => sleep((minimo + Math.random() * (maximo - minimo)) * PAUSA)
const json = { 'Content-Type': 'application/json' }
const conSesion = (token) => ({ ...json, Authorization: `Bearer ${token}` })

/**
 * Registra las cuentas de la corrida antes de empezar: cada persona virtual usa la suya.
 * La corrida y la contraseña se eligen aquí y viajan en los datos de setup: el código de arriba se ejecuta una vez por
 * cada persona virtual, así que un valor al azar calculado ahí sería distinto en cada una.
 */
export function setup() {
  const corrida = Math.random().toString(36).slice(2, 8)
  // "K6" ya da la letra y el número que exige la política de contraseñas (HU-02).
  const contrasena = `K6-${corrida}-${Math.random().toString(36).slice(2, 12)}`
  console.log(`Corrida ${corrida}: se registran ${MAXIMO_DE_PERSONAS} cuentas k6-${corrida}-<n> en ${BASE_URL}.`)

  const cuentas = []
  for (let inicio = 0; inicio < MAXIMO_DE_PERSONAS; inicio += 10) {
    const lote = []
    for (let numero = inicio; numero < Math.min(inicio + 10, MAXIMO_DE_PERSONAS); numero++) {
      lote.push({
        method: 'POST',
        url: `${BASE_URL}/api/auth/registro`,
        body: JSON.stringify({
          nombreCompleto: 'Persona de Prueba K6',
          apodo: `K6 ${numero}`,
          nombreDeUsuario: `k6-${corrida}-${numero}`,
          contrasena,
        }),
        params: { headers: json, tags: { name: 'registro' } },
      })
    }

    for (const [i, respuesta] of http.batch(lote).entries()) {
      if (!check(respuesta, { 'registro: 201': (r) => r.status === 201 })) {
        throw new Error(`No se pudo registrar la cuenta ${inicio + i}: HTTP ${respuesta.status}. Revisa la dirección y que la API esté arriba.`)
      }
      cuentas.push({ usuario: `k6-${corrida}-${inicio + i}`, token: respuesta.json('token') })
    }
  }

  return { corrida, contrasena, cuentas }
}

/** Una visita de una persona: entra, mira su espacio verde y sus avisos, se desahoga y vuelve a mirar. */
export function persona(datos) {
  const cuenta = datos.cuentas[(exec.vu.idInTest - 1) % datos.cuentas.length]
  const headers = conSesion(cuenta.token)

  group('entrar al espacio verde', () => {
    const lote = http.get(`${BASE_URL}/api/espacio-verde`, { headers, tags: { name: 'espacio_verde', meta: 'promedio' } })
    check(lote, { 'espacio verde: 200': (r) => r.status === 200 })

    const avisos = http.get(`${BASE_URL}/api/notificaciones`, { headers, tags: { name: 'notificaciones', meta: 'promedio' } })
    check(avisos, { 'avisos: 200': (r) => r.status === 200 })
  })

  // Elegir la emoción y escribir lleva su tiempo.
  pausa(20, 45)

  group('desahogarse', () => {
    const guardado = http.post(
      `${BASE_URL}/api/desahogos`,
      JSON.stringify({ emocion: elegir(EMOCIONES), texto: elegir(TEXTOS) }),
      { headers, tags: { name: 'guardar_desahogo' } },
    )
    check(guardado, {
      'desahogo: 201': (r) => r.status === 201,
      'desahogo: trae mensaje de apoyo': (r) => r.status === 201 && Boolean(r.json('mensajeDeApoyo.texto')),
      'desahogo: no es de crisis': (r) => r.status === 201 && r.json('mensajeDeApoyo.esDeCrisis') === false,
    })

    // Leer el mensaje y ver cómo se regó el lote.
    pausa(5, 15)
    const lote = http.get(`${BASE_URL}/api/espacio-verde`, { headers, tags: { name: 'espacio_verde', meta: 'promedio' } })
    check(lote, { 'espacio verde después del riego: 200': (r) => r.status === 200 })
  })

  if (Math.random() < 0.3) {
    const sugerencias = http.get(`${BASE_URL}/api/sugerencias`, { headers, tags: { name: 'mis_sugerencias', meta: 'promedio' } })
    check(sugerencias, { 'mis sugerencias: 200': (r) => r.status === 200 })
  }

  // Se queda un rato en su espacio verde antes de irse.
  pausa(30, 90)
}

/** Inicios de sesión con contraseña correcta, a ritmo fijo, para medir el costo de PBKDF2 con la API cargada. */
export function inicioDeSesion(datos) {
  const cuenta = elegir(datos.cuentas)
  const respuesta = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ identificador: cuenta.usuario, contrasena: datos.contrasena }),
    { headers: json, tags: { name: 'iniciar_sesion' } },
  )
  check(respuesta, { 'inicio de sesión: 200': (r) => r.status === 200 })
}

export function teardown(datos) {
  console.log(
    `Corrida ${datos.corrida} terminada. Las cuentas k6-${datos.corrida}-<n> siguen en la base: bórralas con la consulta de tests/carga/README.md.`,
  )
}
