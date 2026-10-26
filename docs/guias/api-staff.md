# API de staff · contrato para el frontend (HU-10)

Todo lo que cuelga de `/api/staff` exige sesión (`Authorization: Bearer <token>`, ver `api-identidad.md`) **y** rol de staff o administración. El backend lo valida en **cada petición** leyendo el rol de la base de datos; ocultar el panel en la interfaz es solo comodidad, la API rechaza igual.

## Roles

| Rol | Valor en la API | Puede |
|---|---|---|
| Usuario | — | Lo suyo: desahogos, sugerencias propias. Nunca entra a `/api/staff` |
| Staff | `staff` | Rutas de `/api/staff` |
| Administrador | `administrador` | Todo lo de staff y, más adelante, la gestión de staff (HU-12) |

Toda persona se registra como usuario regular. El rol **no viaja en el token ni en el login**: el frontend no debe deducirlo, solo preguntarlo a `/api/staff/acceso`.

## Punto de acceso al panel

`GET /api/staff/acceso`

| Código | Cuándo | Cuerpo |
|---|---|---|
| 200 | La persona es staff o administradora | `{ "rol": "staff" }` o `{ "rol": "administrador" }` |
| 401 | Sin sesión, o sesión vencida | `{ "codigo": "NO_AUTENTICADO", "mensaje": "…" }` |
| 403 | Sesión válida, pero la persona no es staff | `{ "codigo": "ACCESO_DENEGADO", "mensaje": "No tienes permiso para esta acción." }` |

Uso sugerido: al abrir la zona de staff, la interfaz llama a esta ruta. Con 200 muestra el panel; con 403 muestra "acceso denegado" o redirige a la pantalla principal; con 401 lleva al inicio de sesión. Las demás rutas de staff responden igual (401 y 403).

## Auditoría

Cada 403 en una ruta de staff o administración deja un registro en la tabla `auditoria_accesos`: persona, fecha y hora, IP, método y ruta (sin parámetros de consulta) y el rol que pedía la ruta. El registro solo se agrega: el código de la aplicación no tiene forma de modificarlo ni borrarlo. Los 401 no se registran (la persona ni siquiera se identificó).

La IP es la que informa el proxy de Railway (`X-Forwarded-For`). El panel de staff **no muestra** esta tabla todavía.

## Cómo se asigna el primer rol de staff o administración

La gestión de staff (HU-12) aún no existe. Mientras tanto, una persona con acceso a la base de datos lo hace con una consulta (Supabase → SQL Editor):

```sql
update treeve.usuarios set rol = 'Administrador' where nombre_de_usuario = 'nombre.de.usuario';
```

Los valores válidos son `Usuario`, `Staff` y `Administrador`. El cambio vale desde la siguiente petición de esa persona.
