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

## Usar el token

Todas las rutas protegidas piden la cabecera `Authorization: Bearer <token>`. Sin token, o con un token vencido o desconocido, responden 401. El token dura 7 días (valor propuesto).

`GET /api/auth/yo` → `200 { "usuarioId": "…" }` con un token válido. Sirve para comprobar la sesión.

El token es equivalente a una contraseña: no se escribe en la consola, en logs ni en la URL.
