# API de administración y notificaciones · contrato para el frontend (HU-12)

Base: la URL del backend. Todo pide sesión (`Authorization: Bearer <token>`, ver [api-identidad.md](api-identidad.md)). Los errores tienen la forma `{ "codigo": "…", "mensaje": "…" }` y el mensaje se puede mostrar tal cual. Decisiones de fondo: [ADR-006](../adr/ADR-006-gestion-de-staff-auditoria-y-notificaciones.md).

Los roles viajan en minúsculas: `usuario`, `staff`, `administrador`.

## Gestión de staff (solo administración)

Todo lo de `/api/admin` exige rol de **administración**, validado en el backend en cada petición. Sin sesión responde 401 `NO_AUTENTICADO`; con sesión pero sin ese rol responde 403 `ACCESO_DENEGADO`, y el intento queda en el log de accesos denegados. Para saber si mostrar la zona de administración, la interfaz puede llamar a `GET /api/staff/acceso` (ver [api-staff.md](api-staff.md)) y mirar si `rol` es `administrador`.

### Listar el staff

`GET /api/admin/staff` → 200

```json
{ "staff": [ { "usuarioId": "…", "nombreDeUsuario": "ana.l", "apodo": "Ani", "rol": "staff" } ] }
```

Incluye al staff y a la administración, ordenados por nombre de usuario. Nunca trae el nombre completo, el correo ni nada de los desahogos.

### Ascender a staff

`POST /api/admin/staff`

```json
{ "nombreDeUsuario": "ana.l" }
```

| Código | Cuándo | Cuerpo |
|---|---|---|
| 200 | Ascendida | `{ "usuarioId", "nombreDeUsuario", "apodo", "rolAnterior": "usuario", "rolNuevo": "staff", "ocurrioEn" }` |
| 400 | No hay nadie con ese usuario, ya es staff o es administradora, o el rol cambió mientras tanto porque otro administrador actuó a la vez | `{ "codigo": "VALIDACION", "mensaje": "…" }` |

No distingue mayúsculas ni espacios en el nombre de usuario.

### Revocar el staff

`DELETE /api/admin/staff/{usuarioId}`: el `usuarioId` sale del listado.

| Código | Cuándo | Cuerpo |
|---|---|---|
| 200 | Revocado: vuelve a ser usuario regular desde su siguiente petición | `{ …, "rolAnterior": "staff", "rolNuevo": "usuario", "ocurrioEn" }` |
| 400 | No es staff, es administradora (incluida la misma persona que pide), no existe, o el rol cambió mientras tanto | `{ "codigo": "VALIDACION", "mensaje": "…" }` |

El rol de un administrador no se cambia desde la aplicación: se asigna con SQL (ver [api-staff.md](api-staff.md)).

Cada ascenso o revocación deja un registro en el log de roles y un aviso para la persona.

### Logs (solo lectura)

| Ruta | Qué muestra |
|---|---|
| `GET /api/admin/auditoria/roles` | Cambios de rol: quién, a quién, rol anterior, rol nuevo y cuándo |
| `GET /api/admin/auditoria/accesos` | Intentos de entrar a rutas de staff o administración sin permiso |

Parámetros opcionales: `limite` (de 1 a 100, por defecto 50) y `desplazamiento` (desde 0). Las respuestas van de la más reciente a la más antigua:

```json
{ "registros": [ { "id": "…", "administradorId": "…", "administrador": "admin.l", "usuarioAfectadoId": "…", "usuarioAfectado": "ana.l", "rolAnterior": "usuario", "rolNuevo": "staff", "ocurrioEn": "…" } ], "hayMas": true }
```

```json
{ "registros": [ { "id": "…", "usuarioId": "…", "nombreDeUsuario": "ana.l", "ocurrioEn": "…", "ip": "203.0.113.7", "recurso": "GET /api/admin/staff", "rolRequerido": "administrador" } ], "hayMas": false }
```

Si la persona ya no existe, su nombre llega como `null`. Para la siguiente página, suma `limite` a `desplazamiento` mientras `hayMas` sea `true`.

**Los logs son inmutables:** la base de datos rechaza cualquier cambio o borrado; solo admite agregar filas.

## Notificaciones (cualquier persona con sesión)

### Mis avisos

`GET /api/notificaciones` → 200, los 50 más recientes:

```json
{ "notificaciones": [ { "notificacionId": "…", "tipo": "ascendido_a_staff", "mensaje": "Ahora formas parte del staff de Treeve. Ya puedes entrar al panel de staff.", "creadaEn": "…", "leida": false } ] }
```

`tipo` es `ascendido_a_staff`, `staff_revocado` o `sugerencia_respondida` (HU-11: el staff cambió el estado o el comentario de una sugerencia de la persona; ver [api-sugerencias.md](api-sugerencias.md)). Muestra el `mensaje` tal cual: el texto lo decide el backend.

### Marcar como leído

`POST /api/notificaciones/{notificacionId}/leida`

| Código | Cuándo |
|---|---|
| 204 | Marcado (marcarlo otra vez no cambia nada) |
| 403 | El aviso es de otra persona o no existe (la misma respuesta, para no revelar cuál) |
