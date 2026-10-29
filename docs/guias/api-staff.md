# API de staff · contrato para el frontend (HU-10)

Todo lo que cuelga de `/api/staff` exige sesión (`Authorization: Bearer <token>`, ver `api-identidad.md`) **y** rol de staff o administración. El backend lo valida en **cada petición** leyendo el rol de la base de datos; ocultar el panel en la interfaz es solo comodidad, la API rechaza igual.

## Roles

| Rol | Valor en la API | Puede |
|---|---|---|
| Usuario | — | Lo suyo: desahogos, sugerencias propias. Nunca entra a `/api/staff` |
| Staff | `staff` | Rutas de `/api/staff` |
| Administrador | `administrador` | Todo lo de staff y la gestión de staff con sus logs (HU-12, ver [api-administracion.md](api-administracion.md)) |

Toda persona se registra como usuario regular. El rol **no viaja en el token ni en el login**: el frontend no debe deducirlo, solo preguntarlo a `/api/staff/acceso`.

## Punto de acceso al panel

`GET /api/staff/acceso`

| Código | Cuándo | Cuerpo |
|---|---|---|
| 200 | La persona es staff o administradora | `{ "rol": "staff" }` o `{ "rol": "administrador" }` |
| 401 | Sin sesión, o sesión vencida | `{ "codigo": "NO_AUTENTICADO", "mensaje": "…" }` |
| 403 | Sesión válida, pero la persona no es staff | `{ "codigo": "ACCESO_DENEGADO", "mensaje": "No tienes permiso para esta acción." }` |

Uso sugerido: al abrir la zona de staff, la interfaz llama a esta ruta. Con 200 muestra el panel; con 403 muestra "acceso denegado" o redirige a la pantalla principal; con 401 lleva al inicio de sesión. Las demás rutas de staff responden igual (401 y 403).

## Sugerencias

`GET /api/staff/sugerencias` (HU-09) lista las sugerencias con filtros y paginación; el contrato está en `api-sugerencias.md`.

## Auditoría

Cada 403 en una ruta de staff o administración deja un registro en la tabla `auditoria_accesos`: persona, fecha y hora, IP, método y ruta (sin parámetros de consulta) y el rol que pedía la ruta. El registro solo se agrega: ni el código de la aplicación ni la base de datos permiten modificarlo o borrarlo (un trigger lo impide, ADR-006). Los 401 no se registran (la persona ni siquiera se identificó).

La IP es la que informa el proxy de Railway (`X-Forwarded-For`). Un administrador la consulta con `GET /api/admin/auditoria/accesos` (HU-12); el panel de staff no la muestra.

## Cómo se asigna el rol de administración

El **staff** lo gestiona un administrador desde la API (HU-12, [api-administracion.md](api-administracion.md)). El rol de **administración**, en cambio, no se cambia desde la aplicación (ADR-006): una persona con acceso a la base de datos lo asigna con una consulta (Supabase → SQL Editor):

```sql
update treeve.usuarios set rol = 'Administrador' where nombre_de_usuario = 'nombre.de.usuario';
```

Los valores válidos son `Usuario`, `Staff` y `Administrador`. El cambio vale desde la siguiente petición de esa persona.
