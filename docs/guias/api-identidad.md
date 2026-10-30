# API de identidad · contrato para el frontend

Base: la URL del backend (`https://…up.railway.app`). Todo viaja por HTTPS; en producción la API rechaza peticiones `/api` que no lleguen por HTTPS. Cuerpos y respuestas en JSON (camelCase).

Los errores tienen siempre esta forma: `{ "codigo": "VALIDACION", "mensaje": "…" }`. El mensaje se puede mostrar al usuario.

## HU-02 · Registro

`POST /api/auth/registro`

```json
{
  "nombreCompleto": "Ana López",
  "apodo": "Ani",
  "nombreDeUsuario": "ana.l",
  "contrasena": "Treeve2026",
  "correo": "ana@correo.com",
  "motivoDeRegistro": "Quiero un espacio para desahogarme"
}
```

Obligatorios: `nombreCompleto` (2–100), `apodo` (2–30), `nombreDeUsuario` (3–30; letras, números, `.`, `-`, `_`; no distingue mayúsculas) y `contrasena` (8–128 caracteres con al menos una letra y un número). Opcionales: `correo` y `motivoDeRegistro` (hasta 500).

| Código | Cuándo | Cuerpo |
|---|---|---|
| 201 | Registro correcto; el usuario ya queda con la sesión abierta | `{ "usuarioId", "apodo", "token", "expiraEn" }` |
| 400 | Un dato no cumple las reglas, o el usuario/correo ya están en uso | `{ "codigo": "VALIDACION", "mensaje": "…" }` |

## HU-03a · Inicio de sesión

`POST /api/auth/login`

```json
{ "identificador": "ana.l", "contrasena": "Treeve2026" }
```

`identificador` es el nombre de usuario **o** el correo; no distingue mayúsculas.

| Código | Cuándo | Cuerpo |
|---|---|---|
| 200 | Credenciales correctas | `{ "usuarioId", "apodo", "token", "expiraEn" }` |
| 401 | Usuario o contraseña incorrectos | `{ "codigo": "CREDENCIALES_INVALIDAS", "mensaje": "Usuario o contraseña incorrectos." }` |
| 429 | Cuenta bloqueada por 5 intentos fallidos seguidos | `{ "codigo": "CUENTA_BLOQUEADA", "mensaje": "… Intenta de nuevo en N minuto(s)." }` y cabecera `Retry-After` (segundos, legible desde el frontend) |

El mensaje del 401 es el mismo si el usuario no existe o si la contraseña es incorrecta: no revela cuál dato falló. Tras **5 intentos fallidos consecutivos** la cuenta se bloquea **15 minutos**; un inicio de sesión correcto reinicia el conteo. Mientras está bloqueada, ni siquiera la contraseña correcta entra.

## HU-03b · Recuperar la contraseña

Solo sirve para quien registró un correo. Son dos pasos, los dos **sin sesión**.

### 1. Pedir el enlace

`POST /api/auth/recuperacion`

```json
{ "correo": "ana@correo.com" }
```

| Código | Cuándo | Cuerpo |
|---|---|---|
| 202 | Siempre que el texto parezca un correo | `{ "mensaje": "Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña. Revisa también la carpeta de spam." }` |
| 400 | El texto está vacío o no parece un correo | `{ "codigo": "VALIDACION", "mensaje": "…" }` |

La respuesta es **idéntica** exista o no el correo, haya salido o no el mensaje, y aunque la persona haya pedido otro enlace hace menos de 2 minutos. La interfaz debe mostrar siempre ese `mensaje` y nada más; no debe decir "correo no encontrado" ni "correo enviado". Quien no registró correo no puede recuperar su contraseña por este medio.

### 2. El enlace del correo

El correo trae un botón que lleva a `<Recuperacion__UrlBase>?token=<token>`. La dirección `Recuperacion__UrlBase` es la pantalla del frontend que se define al desplegar la API (por ejemplo `https://tu-frontend.vercel.app/restablecer-contrasena`). Esa pantalla:

1. Lee el parámetro `token` de la dirección.
2. Pide la contraseña nueva (mismas reglas que el registro: 8 a 128 caracteres, con una letra y un número).
3. Llama al paso 3 con ese `token` y la contraseña.

El token es de **un solo uso** y **dura 30 minutos**. Si la persona pide otro enlace, el anterior deja de servir. No se debe guardar ni escribir en la consola o en logs.

### 3. Cambiar la contraseña

`POST /api/auth/recuperacion/restablecer`

```json
{ "token": "…", "contrasena": "NuevaClave2026" }
```

| Código | Cuándo | Cuerpo |
|---|---|---|
| 204 | Contraseña cambiada | (sin cuerpo) |
| 400 | La contraseña no cumple la política | `{ "codigo": "VALIDACION", "mensaje": "…" }`. El enlace **no** se gasta: se puede reintentar |
| 400 | El enlace no existe, ya se usó o venció | `{ "codigo": "TOKEN_INVALIDO", "mensaje": "El enlace no es válido o ya venció. Solicita uno nuevo." }` |

Tras el 204 la interfaz lleva a "Iniciar sesión". Al cambiar la contraseña se **cierran todas las sesiones** abiertas de la persona (también la actual) y se levanta el bloqueo por intentos fallidos. Con `TOKEN_INVALIDO` la interfaz ofrece volver a pedir un enlace.

## Usar el token

Todas las rutas protegidas piden la cabecera `Authorization: Bearer <token>`. Sin token, o con un token vencido o desconocido, responden 401 con `{ "codigo": "NO_AUTENTICADO", "mensaje": "Inicia sesión para continuar." }`. El token dura 7 días (valor propuesto).

`GET /api/auth/yo` → `200 { "usuarioId": "…" }` con un token válido. Sirve para comprobar la sesión.

El token es equivalente a una contraseña: no se escribe en la consola, en logs ni en la URL.
