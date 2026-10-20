# ADR-005 · Autenticación y sesiones

- **Estado:** Propuesto (pendiente de aprobación del arquitecto)
- **Fecha:** 2026-10-17
- **Decisores:** Nicolás (arquitecto), Juan José (backend)
- **Historias relacionadas:** HU-02, HU-03a, HU-03b, HU-10

## Contexto

HU-02 exige contraseñas con hash y sal, registro con acceso automático y todo sobre HTTPS. HU-03a exige iniciar sesión con usuario o correo, un mensaje de error que no diga qué dato falló y bloqueo temporal tras 5 intentos fallidos consecutivos. El frontend (Vercel) y la API (Railway) están en dominios distintos. No se agregan paquetes sin ADR (CLAUDE.md) y se descartó Supabase Auth (ADR-002).

## Decisión

1. **Contraseñas:** PBKDF2-HMAC-SHA256, 600 000 iteraciones (recomendación de OWASP), sal aleatoria de 16 bytes por contraseña, con `System.Security.Cryptography` (sin paquetes nuevos). El formato guardado incluye las iteraciones (`pbkdf2-sha256$iteraciones$sal$hash`) para poder subirlas sin invalidar las existentes. Política mínima propuesta: entre 8 y 128 caracteres, con al menos una letra y un número.
2. **Sesiones:** token opaco de 256 bits aleatorios. En la base de datos solo se guarda su SHA-256 (tabla `sesiones`); el token en claro solo lo conoce el cliente. Viaja en `Authorization: Bearer`. Vigencia propuesta: 7 días. Cada petición protegida consulta la tabla, por eso una sesión se puede revocar desde el servidor.
3. **Bloqueo (HU-03a):** 5 intentos fallidos consecutivos bloquean la cuenta 15 minutos. El contador y la fecha de fin viven en `usuarios`. Un acceso correcto reinicia el conteo. Con la cuenta bloqueada no se verifica la contraseña. La respuesta es 429 con `Retry-After`.
4. **Mensajes:** credenciales incorrectas y usuario inexistente responden lo mismo (401, mismo texto) y tardan lo mismo, porque con un hash nulo se gasta igual el trabajo de PBKDF2.
5. **HTTPS:** en producción, las rutas `/api` rechazan peticiones que no lleguen por HTTPS (según `X-Forwarded-Proto` del proxy de la plataforma). Además se envía HSTS.
6. **Hexagonal:** `IHasheadorDeContrasenas` e `IEmisorDeTokens` son puertos del anillo Application; las implementaciones viven en Infrastructure. La autenticación HTTP (`SesionAuthenticationHandler`) solo llama al caso de uso `ValidarSesion`.

## Alternativas consideradas

| Alternativa | Motivo del descarte |
|---|---|
| JWT firmado | Requiere un paquete nuevo y no se puede revocar antes de que venza |
| Cookie de sesión | Con frontend y API en dominios distintos depende de cookies de terceros, que Safari bloquea |
| ASP.NET Core Identity | Trae sus propias tablas y flujos; el modelo `Usuario` ya está definido por el dominio |
| bcrypt o Argon2 | Necesitan un paquete nuevo; PBKDF2 viene en el framework |

## Consecuencias

- **Positivas:** sin dependencias nuevas; sesiones revocables; ni contraseñas ni tokens quedan en claro en la base de datos.
- **Negativas:** una consulta a la base de datos por petición autenticada; el hash tarda unos 0,3 a 0,5 s por login, a propósito (hay que medirlo en Railway frente a la meta de 0,5 s del proyecto y, si hace falta, ajustar las iteraciones en un ADR).
- **Verificación:** pruebas de dominio y de aplicación de HU-02 y HU-03a, y pruebas de punta a punta contra la API desplegada.

## Pendiente

- Cierre de sesión y revocación (historia futura) y limpieza de sesiones vencidas.
- Límite de peticiones por IP en login y registro (el bloqueo es por cuenta, no frena el recorrido de muchas cuentas).
- El contador de intentos no es atómico: bajo peticiones simultáneas podrían colarse unos pocos intentos extra. Aceptable para la escala del proyecto.
- El frontend debe guardar el token en memoria o `sessionStorage` y nunca registrarlo en consola.
- `motivoDeRegistro` es texto libre y puede ser sensible: hoy se guarda sin cifrar y no se escribe en logs. Evaluar cifrarlo.
