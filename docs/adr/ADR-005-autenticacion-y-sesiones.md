# ADR-005 · Autenticación y sesiones

- **Estado:** Aceptado (2026-10-20), con los valores propuestos para la política de contraseña y la duración de la sesión
- **Fecha:** 2026-10-17
- **Decisores:** Nicolás (arquitecto), Juan José (backend)
- **Historias relacionadas:** HU-02, HU-03a, HU-03b, HU-10

## Contexto

HU-02 exige contraseñas con hash y sal, registro con acceso automático y todo sobre HTTPS. HU-03a exige iniciar sesión con usuario o correo, un mensaje de error que no diga qué dato falló y bloqueo temporal tras 5 intentos fallidos consecutivos. El frontend (Vercel) y la API (Railway) están en dominios distintos. No se agregan paquetes sin ADR (CLAUDE.md) y se descartó Supabase Auth (ADR-002).

## Decisión

1. **Contraseñas:** PBKDF2-HMAC-SHA256, 600 000 iteraciones (recomendación de OWASP), sal aleatoria de 16 bytes por contraseña, con `System.Security.Cryptography` (sin paquetes nuevos). El formato guardado incluye las iteraciones (`pbkdf2-sha256$iteraciones$sal$hash`) para poder subirlas sin invalidar las existentes. Política mínima propuesta: entre 8 y 128 caracteres, con al menos una letra y un número.
2. **Sesiones:** token opaco de 256 bits aleatorios. En la base de datos solo se guarda su SHA-256 (tabla `sesiones`); el token en claro solo lo conoce el cliente. Viaja en `Authorization: Bearer`. Vigencia propuesta: 7 días. Cada petición protegida consulta la tabla, por eso una sesión se puede revocar desde el servidor.
3. **Bloqueo (HU-03a):** 5 intentos fallidos consecutivos bloquean la cuenta 15 minutos. El hash, el contador y la fecha de fin viven en la tabla `credenciales` (1:1 con `usuarios`), separada del perfil para que ninguna consulta de perfil ni del panel de staff toque datos de acceso. Un acceso correcto reinicia el conteo. Con la cuenta bloqueada no se verifica la contraseña. La respuesta es 429 con `Retry-After`.
4. **Mensajes:** credenciales incorrectas y usuario inexistente responden lo mismo (401, mismo texto) y tardan lo mismo, porque con un hash nulo se gasta igual el trabajo de PBKDF2.
5. **HTTPS:** en producción, las rutas `/api` rechazan peticiones que no lleguen por HTTPS (según `X-Forwarded-Proto` del proxy de la plataforma). Además se envía HSTS.
6. **Puertos (Onion, ADR-004):** `IHasheadorDeContrasenas` e `IEmisorDeTokens` son puertos del anillo Application; las implementaciones viven en Infrastructure. La autenticación HTTP (`SesionAuthenticationHandler`) solo llama al caso de uso `ValidarSesion`.

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

## Roles y acceso de staff (HU-10)

- **Dónde vive el rol:** columna `rol` de `usuarios` (`Usuario`, `Staff`, `Administrador`; por defecto `Usuario`). No va en el token ni en la respuesta del login.
- **Cuándo se valida:** en cada petición a una ruta de staff o administración, el caso de uso `AutorizarAcceso` lee el rol de la base de datos. Así, revocar un rol (HU-12) vale desde la siguiente petición, sin esperar a que venza la sesión. El costo es una consulta por petición de staff (bajo volumen).
- **Cómo se aplica:** `RequiereRol(Rol.Staff)` es un filtro de endpoint que llama al caso de uso; la regla está en el núcleo, no en los endpoints ni en el frontend.
- **Auditoría:** cada acceso sin permiso se registra en `auditoria_accesos` (persona, fecha y hora, IP, método y ruta sin consulta, rol requerido). El puerto `IRepositorioAuditoria` solo ofrece `Registrar` y, desde HU-12, `Listar` para que un administrador lo lea; la base de datos impide modificarlo (ADR-006). No hay llave foránea a `usuarios`: el registro no debe desaparecer con la persona. Si no se puede escribir el registro, la petición falla (se niega ante la duda).
- **Administradores:** se asignan con una consulta SQL (ver `docs/guias/api-staff.md`). El staff lo gestiona un administrador desde la API (HU-12, ADR-006).
- **Riesgo aceptado:** una persona con sesión puede generar muchos registros de auditoría golpeando una ruta de staff. Se mitiga con el límite de peticiones por IP pendiente (más arriba).

## Pendiente

- Cierre de sesión y revocación (historia futura) y limpieza de sesiones vencidas.
- Límite de peticiones por IP en login y registro (el bloqueo es por cuenta, no frena el recorrido de muchas cuentas).
- El contador de intentos no es atómico: bajo peticiones simultáneas podrían colarse unos pocos intentos extra. Aceptable para la escala del proyecto.
- El frontend debe guardar el token en memoria o `sessionStorage` y nunca registrarlo en consola.

## Riesgos conocidos (aceptados)

- **Se puede averiguar si un correo está registrado.** En el registro, "El usuario o el correo ya están en uso" lo revela si se usa un usuario nuevo con un correo ajeno. En el login, tras 5 intentos fallidos con ese correo, el sexto responde 429 si la cuenta existe y 401 si no. Se acepta para la versión 1. La mitigación sería avisar al dueño de la cuenta por otro canal (por ejemplo, SMS), que hoy no está contemplado.
- **Bloqueo intencional de cuentas ajenas.** Quien conozca un nombre de usuario puede bloquear esa cuenta 15 minutos. Se mitiga con el límite de peticiones por IP pendiente.
