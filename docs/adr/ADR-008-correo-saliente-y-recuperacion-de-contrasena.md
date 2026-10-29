# ADR-008 · Correo saliente y recuperación de contraseña

- **Estado:** Propuesto (2026-10-29), pendiente de aprobación de Nicolás
- **Fecha:** 2026-10-29
- **Decisores:** Nicolás (arquitecto), Juan José (backend)
- **Historias relacionadas:** HU-03b

## Contexto

HU-03b exige recuperar la contraseña por correo si la persona lo registró, con un enlace de un solo uso que expira y sin revelar si un correo existe. Es la primera funcionalidad que **envía correo**, así que hace falta decidir cómo. Restricciones: no se agregan paquetes sin ADR (CLAUDE.md); el backend corre en Railway, que bloquea el SMTP saliente (puertos 465 y 587) en varios planes; el equipo no tiene dominio propio, y los servicios que dan un plan gratis suelen exigir uno verificado para escribirle a cualquier persona.

## Decisión

1. **Envío con la API de Gmail por HTTPS**, desde una cuenta de Gmail del proyecto. Con un *refresh token* OAuth2 se pide un *access token* a Google (que se guarda hasta un minuto antes de que venza) y se llama a `users.messages.send`. Solo usa `HttpClient` y `System.Text.Json` del framework: **sin paquetes nuevos**. Credenciales por entorno, nunca en el repositorio: `Correo__Gmail__ClientId`, `__ClientSecret`, `__RefreshToken`, `__Remitente`. Si no hay ninguna, la API arranca y el envío queda en el log como "no configurado"; si hay algunas pero no todas, el arranque falla.
2. **Puertos (Onion, ADR-004):** el núcleo conoce solo `INotificadorDeRecuperacion` (anillo Application), que recibe el token en claro una sola vez. Infrastructure arma el enlace y el texto del correo (`NotificadorDeRecuperacionPorCorreo`) y lo manda por un transporte interno `IEnviadorDeCorreo` (`EnviadorDeCorreoGmail`). Cambiar de proveedor toca solo ese archivo.
3. **Enlace:** `Recuperacion__UrlBase` (obligatoria cuando el correo está configurado) + `?token=…`. El frontend recibe el token en esa pantalla y lo manda a la API.
4. **Token:** 256 bits aleatorios (`IEmisorDeTokens`); en la tabla `recuperaciones_contrasena` solo queda su SHA-256. **Un solo uso** (`usada_en`, marcado con un `UPDATE` condicional atómico, de modo que dos peticiones simultáneas no pueden gastarlo las dos) y **vence a los 30 minutos** (valor propuesto). Pedir un enlace nuevo deja sin efecto los anteriores.
5. **No revelar si el correo existe:** la ruta responde siempre 202 con el mismo texto, exista o no el correo, haya salido o no el correo, y aunque la persona haya pedido otro enlace hace poco. Solo un texto que no parece un correo recibe 400.
6. **Contra el abuso:** una misma cuenta recibe como máximo un correo cada 2 minutos. El token inválido, vencido o ya usado da el mismo 400 `TOKEN_INVALIDO`. La contraseña nueva se valida **antes** de gastar el enlace, y el hash costoso solo se calcula si el enlace es válido.
7. **Al cambiar la contraseña** se cierran todas las sesiones abiertas de la persona y se levanta el bloqueo por intentos fallidos.
8. **Privacidad en los registros:** nunca se escribe el destinatario, el enlace, el token ni los secretos; solo el estado HTTP y el código de error de Google.

## Alternativas consideradas

| Alternativa | Motivo del descarte |
|---|---|
| Gmail por SMTP con contraseña de aplicación | Railway bloquea el SMTP saliente en varios planes; funcionaría en un computador y fallaría en producción |
| Resend, Brevo u otro servicio de correo | Sin dominio verificado, el plan gratis de Resend solo escribe al dueño de la cuenta; no es de Google |
| Paquete del SDK de Google o MailKit | Dependencias nuevas que exigen ADR; las llamadas necesarias son dos peticiones HTTPS |
| Enlace sin token en base de datos (token firmado) | No se podría limitar a un solo uso ni invalidar los enlaces anteriores sin guardar estado |

## Consecuencias

- **Positivas:** funciona en Railway sin importar el plan; sin dependencias nuevas; el proveedor es reemplazable; los secretos viven solo en el entorno.
- **Negativas:** hay que crear un proyecto en Google Cloud y obtener un *refresh token* una vez (guía en `docs/guias/configuracion-correo-gmail.md`). Gmail limita los envíos a unos 500 al día por cuenta. Mientras la aplicación de Google esté en modo "Prueba", el refresh token vence a los 7 días: hay que **publicarla** (a "En producción") para que no caduque. Si el refresh token se revoca, los correos dejan de salir y el único rastro es el log (`invalid_grant`).
- **Riesgo aceptado:** la respuesta con correo registrado tarda un poco más que con uno no registrado (hay una escritura en base de datos y una llamada a Google). Es una diferencia de tiempo, no de contenido; si se considera un riesgo, el siguiente paso es mandar el correo en segundo plano con una cola.
- **Pendiente:** limpieza de recuperaciones vencidas (no hace falta por ahora; la tabla crece con las solicitudes).
- **Verificación:** pruebas del dominio (vigencia, uso único), de los casos de uso (misma respuesta con correo inexistente, límite de frecuencia, sesiones cerradas, la contraseña débil no gasta el enlace), del armado del mensaje y del cliente de Gmail con un servidor HTTP simulado; CI con las pruebas de arquitectura.
