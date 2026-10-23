# API de desahogos · contrato para el frontend

Base: la URL del backend. Todo viaja por HTTPS y pide sesión: cabecera `Authorization: Bearer <token>` (ver [api-identidad.md](api-identidad.md)). Sin token responde 401 `NO_AUTENTICADO`. Cuerpos y respuestas en JSON (camelCase). Los errores tienen la forma `{ "codigo": "…", "mensaje": "…" }`.

La persona sale siempre del token: el cuerpo de la petición nunca lleva un `usuarioId`.

## HU-05 · Guardar un desahogo

`POST /api/desahogos`

```json
{ "emocion": "tristeza", "texto": "Hoy fue un día pesado." }
```

`emocion` es una de `tristeza`, `rabia`, `miedo`, `duda`, `felicidad` (no distingue mayúsculas). `texto` es obligatorio, no puede ser solo espacios y tiene **hasta 2000 caracteres**; el backend vuelve a validarlo aunque el frontend ya lo haga.

| Código | Cuándo | Cuerpo |
|---|---|---|
| 201 | Guardado. Cabecera `Location: /api/desahogos/{notaId}` | `{ "notaId", "creadaEn", "mensajeDeApoyo": { "texto", "esDeCrisis" } }` |
| 400 | Emoción desconocida, texto vacío o de más de 2000 caracteres | `{ "codigo": "VALIDACION", "mensaje": "…" }` |
| 401 | Sin sesión o sesión vencida | `{ "codigo": "NO_AUTENTICADO", … }` |

`creadaEn` es la fecha y hora en que el sistema asoció el escrito con la emoción elegida.

`mensajeDeApoyo` es la respuesta a ese desahogo (HU-06a-1), armada en la misma petición para cumplir los 2 s. Nombra a la persona con su apodo y no repite fragmentos de sus últimas 5 respuestas. Si `esDeCrisis` es `true`, el texto es el mensaje fijo de crisis: la interfaz lo muestra y presenta la línea de atención como **sugerencia**, sin redirigir ni bloquear nada. En ese caso no se guarda nada sobre la respuesta, ni siquiera que hubo crisis. El `texto` nombra a la persona: no se escribe en la consola ni en logs.

El texto se guarda **cifrado** (AES-256-GCM, ADR-002), atado a la persona y a la nota. En la base de datos nunca queda en claro y nunca se escribe en los logs.

## Leer un desahogo

`GET /api/desahogos/{notaId}`

| Código | Cuándo | Cuerpo |
|---|---|---|
| 200 | La nota es de la persona de la sesión | `{ "notaId", "emocion", "texto", "creadaEn" }` |
| 403 | La nota es de otra persona **o no existe** (la misma respuesta, para no revelar cuál) | `{ "codigo": "ACCESO_DENEGADO", … }` |

Solo la persona dueña puede leer sus desahogos. No hay ninguna ruta para el staff ni para un administrador.

## Qué pasa al guardar

1. Se valida y se cifra el texto, y se guarda la nota.
2. Se publica el evento interno `NotaCreada` (solo ids, emoción y fecha; nunca el texto) para que otras áreas reaccionen, p. ej. el árbol (HU-07a).
3. Se arma el mensaje de apoyo y se devuelve en la respuesta. No va por evento: la persona lo ve al terminar de guardar.

Si falla el paso 3 (por ejemplo, la base de datos no responde), la nota ya quedó guardada y publicada, y la API responde con error 500. Quien llame no debe reintentar el `POST` a ciegas, porque crearía una segunda nota.

## Seguir una petición en los logs

Toda respuesta trae la cabecera `X-Correlation-Id`. Si el frontend manda la suya (letras, números, `.`, `-`, `_`, hasta 64 caracteres) se respeta; si no, se genera. Esa cabecera también sale en las líneas del log de la petición como `CorrelacionId:…`. Sirve para reportar un problema sin compartir el contenido del desahogo.
