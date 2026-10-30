# API de sugerencias · contrato para el frontend (HU-09 y HU-11)

Base: la URL del backend. Cuerpos y respuestas en JSON (camelCase). Los errores tienen siempre la forma `{ "codigo": "VALIDACION", "mensaje": "…" }`. Todas las rutas piden `Authorization: Bearer <token>` (ver `api-identidad.md`); sin sesión responden 401.

La persona sale del token, nunca del cuerpo de la petición.

## Estados

| Valor en la API | Significado |
|---|---|
| `pendiente` | Recién enviada. Toda sugerencia nace así |
| `en_revision` | El staff la está evaluando |
| `implementada` | Se hizo |
| `rechazada` | No se hará |

El staff cambia el estado y deja un comentario (HU-11, más abajo). Los cambios de estado son libres entre los cuatro: así el staff puede corregir un error.

## Enviar una sugerencia

`POST /api/sugerencias`

```json
{ "texto": "Me gustaría un modo oscuro" }
```

El texto es libre, se recorta de espacios al inicio y al final, no puede quedar vacío y admite hasta **1000 caracteres** (si el formulario muestra un contador, que use ese número; decide el backend).

| Código | Cuándo | Cuerpo |
|---|---|---|
| 201 | Guardada | `{ "sugerenciaId": "…", "creadaEn": "2026-10-26T15:00:00-05:00", "estado": "pendiente" }` |
| 400 | Texto vacío o de más de 1000 caracteres | `{ "codigo": "VALIDACION", "mensaje": "…" }`, con un mensaje que se puede mostrar |
| 401 | Sin sesión | `{ "codigo": "NO_AUTENTICADO", "mensaje": "…" }` |

Con el 201 la interfaz muestra la confirmación de envío.

## Historial propio

`GET /api/sugerencias`

Devuelve **solo** las sugerencias de la persona con sesión, de la más reciente a la más antigua (hasta 200).

```json
{
  "sugerencias": [
    {
      "sugerenciaId": "…",
      "texto": "Me gustaría un modo oscuro",
      "estado": "implementada",
      "creadaEn": "2026-10-26T15:00:00-05:00",
      "comentario": "Ya está disponible en los ajustes.",
      "respondidaEn": "2026-10-30T10:00:00-05:00"
    }
  ]
}
```

- `comentario` es la respuesta del staff (HU-11), o `null` si no hay. Hay **una** por sugerencia: si el staff escribe otra, reemplaza a la anterior. Aquí es donde la persona la ve.
- `respondidaEn` es cuándo el staff cambió el estado o el comentario por última vez (`null` si nunca). No se informa **quién** del staff respondió.
- Cuando el staff gestiona una sugerencia, la persona además recibe un aviso de tipo `sugerencia_respondida` en `GET /api/notificaciones` (ver [api-administracion.md](api-administracion.md)). El aviso no repite el comentario: invita a mirar el historial.

Sin sugerencias: `{ "sugerencias": [] }`.

## Listado para staff

`GET /api/staff/sugerencias` · solo staff o administración (HU-10): un usuario regular recibe 403 y el intento queda en la auditoría. Ver `api-staff.md`.

Parámetros de consulta, todos opcionales y combinables:

| Parámetro | Qué hace |
|---|---|
| `estado` | `pendiente`, `en_revision`, `implementada` o `rechazada` |
| `desde` | Fecha ISO 8601 (`2026-10-01` o `2026-10-01T00:00:00-05:00`); incluida. Sin zona horaria se toma como **hora de Colombia** (UTC-5, sin horario de verano); con zona (`Z`, `-05:00`) se respeta la que se envíe |
| `hasta` | Igual que `desde`; **no** incluida. Debe ser posterior a `desde` |
| `usuario` | Nombre de usuario exacto (no distingue mayúsculas) |
| `limite` | Filas por página, de 1 a 100 (por defecto 50) |
| `desplazamiento` | Filas a saltar (por defecto 0). Para la siguiente página: `desplazamiento = desplazamiento + limite` |
| `orden` | HU-11. `recientes` (por defecto), `antiguas` (las que más llevan esperando primero) o `usuario` (por nombre de usuario de la A a la Z; dentro de cada persona, la más reciente primero) |

```json
{
  "sugerencias": [
    {
      "sugerenciaId": "…",
      "usuarioId": "…",
      "nombreDeUsuario": "ana.l",
      "texto": "Me gustaría un modo oscuro",
      "estado": "en_revision",
      "creadaEn": "2026-10-26T15:00:00-05:00",
      "comentario": "Lo vamos a evaluar.",
      "gestionadaEn": "2026-10-30T10:00:00-05:00"
    }
  ],
  "hayMas": false
}
```

El orden lo da `orden`. `hayMas: true` significa que existe otra página. Un filtro mal escrito (estado u orden desconocido, fecha que no es fecha, límite fuera de rango) responde 400 `VALIDACION`. El filtrado, el orden y la paginación los resuelve la base de datos con índices (RNF de HU-11: 1000+ registros en menos de 2 s).

El listado muestra el **nombre de usuario**, no el correo ni el nombre completo. Los desahogos no aparecen en ninguna ruta de staff.

## Gestionar una sugerencia (HU-11)

`PATCH /api/staff/sugerencias/{sugerenciaId}` · solo staff o administración, como el listado.

```json
{ "estado": "implementada", "comentario": "Ya está disponible en los ajustes." }
```

Los dos campos son opcionales, pero debe venir **al menos uno**:

| Campo | Qué hace |
|---|---|
| `estado` | `pendiente`, `en_revision`, `implementada` o `rechazada`. Si no viene, el estado no cambia |
| `comentario` | Hasta **500 caracteres** (se recorta de espacios). Si no viene, el comentario no cambia; `""` lo **quita**. Lo ve quien sugirió en su historial |

| Código | Cuándo | Cuerpo |
|---|---|---|
| 200 | Gestionada | `{ "sugerenciaId": "…", "estado": "implementada", "comentario": "…", "gestionadaEn": "…", "huboCambios": true }` |
| 400 | Sin estado ni comentario, estado desconocido, comentario de más de 500 caracteres o sugerencia que no existe | `{ "codigo": "VALIDACION", "mensaje": "…" }`, con un mensaje que se puede mostrar |
| 401 | Sin sesión | `{ "codigo": "NO_AUTENTICADO", "mensaje": "…" }` |
| 403 | La persona no es staff (queda en la auditoría) | `{ "codigo": "ACCESO_DENEGADO", "mensaje": "…" }` |

- `huboCambios: false` significa que se envió lo mismo que ya tenía: no se guardó nada ni se avisó a nadie.
- Si algo cambió, se guarda quién del staff lo hizo y cuándo, y quien sugirió recibe un aviso dentro de la app.
- Si dos personas del staff gestionan la misma sugerencia a la vez, queda la última.

Uso sugerido en el panel: un selector de estado y un campo de comentario con contador de 500 por fila (o en un detalle), y un botón "Guardar" que envía solo lo que cambió.
