# API de sugerencias · contrato para el frontend (HU-09)

Base: la URL del backend. Cuerpos y respuestas en JSON (camelCase). Los errores tienen siempre la forma `{ "codigo": "VALIDACION", "mensaje": "…" }`. Todas las rutas piden `Authorization: Bearer <token>` (ver `api-identidad.md`); sin sesión responden 401.

La persona sale del token, nunca del cuerpo de la petición.

## Estados

| Valor en la API | Significado |
|---|---|
| `pendiente` | Recién enviada. Toda sugerencia nace así |
| `en_revision` | El staff la está evaluando |
| `implementada` | Se hizo |
| `rechazada` | No se hará |

Cambiar el estado y comentar es parte de HU-11; por ahora todas quedan `pendiente`.

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
    { "sugerenciaId": "…", "texto": "Me gustaría un modo oscuro", "estado": "pendiente", "creadaEn": "2026-10-26T15:00:00-05:00" }
  ]
}
```

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

```json
{
  "sugerencias": [
    {
      "sugerenciaId": "…",
      "usuarioId": "…",
      "nombreDeUsuario": "ana.l",
      "texto": "Me gustaría un modo oscuro",
      "estado": "pendiente",
      "creadaEn": "2026-10-26T15:00:00-05:00"
    }
  ],
  "hayMas": false
}
```

Van de la más reciente a la más antigua. `hayMas: true` significa que existe otra página. Un filtro mal escrito (estado desconocido, fecha que no es fecha, límite fuera de rango) responde 400 `VALIDACION`.

El listado muestra el **nombre de usuario**, no el correo ni el nombre completo. Los desahogos no aparecen en ninguna ruta de staff.
