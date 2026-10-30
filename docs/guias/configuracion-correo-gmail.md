# Configurar el correo de recuperación con Gmail (HU-03b)

Para: Juan José y Nicolás. La decisión está en [ADR-008](../adr/ADR-008-correo-saliente-y-recuperacion-de-contrasena.md).

La API envía los correos de recuperación con la **API de Gmail** desde una cuenta de Gmail del proyecto. Se hace **una sola vez**; después solo se guardan cuatro variables de entorno. Sin esas variables la API arranca igual, pero los correos no salen (queda un aviso en el log).

> **Secretos.** `ClientSecret` y `RefreshToken` equivalen a una contraseña de esa cuenta de Gmail. Nunca los pegues en el chat, en el repositorio, en ClickUp ni en un PR. Guárdalos solo en Railway y en tus secretos locales.

## 1. Escoge la cuenta de Gmail

Usa una cuenta del proyecto (por ejemplo `treeve.app@gmail.com`), no tu cuenta personal: los correos saldrán de esa dirección y, si se revoca el acceso, afecta a toda la cuenta. Gmail limita los envíos a unos 500 por día.

## 2. Crea el proyecto en Google Cloud

1. Entra a <https://console.cloud.google.com> con esa cuenta.
2. Arriba, en el selector de proyectos, **Proyecto nuevo** → nombre `Treeve` → **Crear**.
3. Menú **APIs y servicios → Biblioteca**, busca **Gmail API** y pulsa **Habilitar**.

## 3. Pantalla de consentimiento

1. **APIs y servicios → Pantalla de consentimiento de OAuth** (o *Google Auth Platform*).
2. Tipo de usuario: **Externo**. Nombre de la aplicación: `Treeve`. Correo de asistencia y de contacto: la misma cuenta.
3. En **Acceso a los datos (Scopes)** agrega solo `https://www.googleapis.com/auth/gmail.send`.
4. En **Usuarios de prueba** agrega la propia cuenta de Gmail.
5. **Importante — publica la aplicación:** en la pantalla de consentimiento pulsa **Publicar aplicación** (pasar de "Prueba" a "En producción"). Mientras esté en "Prueba", el refresh token **vence a los 7 días** y los correos dejarían de salir sin aviso. Google mostrará una advertencia de "aplicación no verificada"; es normal para una cuenta propia y no hace falta verificarla.

## 4. Credenciales OAuth

1. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**.
2. Tipo: **Aplicación web**. Nombre: `Treeve API`.
3. En **URI de redireccionamiento autorizados** agrega exactamente `https://developers.google.com/oauthplayground`.
4. **Crear**. Copia el **ID de cliente** y el **Secreto del cliente** (los dos van a Railway).

## 5. Obtén el refresh token (OAuth Playground)

1. Abre <https://developers.google.com/oauthplayground>.
2. Engranaje (arriba a la derecha) → marca **Use your own OAuth credentials** → pega el ID y el secreto del cliente. Cierra.
3. En el paso 1 escribe en el cuadro de scopes `https://www.googleapis.com/auth/gmail.send` y pulsa **Authorize APIs**.
4. Entra con la cuenta de Gmail del proyecto y acepta (puede decir "Google no verificó esta aplicación": **Avanzado → Ir a Treeve**).
5. En el paso 2 pulsa **Exchange authorization code for tokens**. Copia el **Refresh token**.

## 6. Variables de entorno

En Railway, servicio de la API → **Variables**:

| Variable | Valor |
|---|---|
| `Correo__Gmail__ClientId` | ID de cliente del paso 4 |
| `Correo__Gmail__ClientSecret` | Secreto del cliente del paso 4 |
| `Correo__Gmail__RefreshToken` | Refresh token del paso 5 |
| `Correo__Gmail__Remitente` | La dirección de Gmail, por ejemplo `treeve.app@gmail.com` |
| `Recuperacion__UrlBase` | La pantalla del frontend que recibe el enlace, por ejemplo `https://tu-frontend.vercel.app/restablecer-contrasena` |

Las cuatro de `Correo__Gmail__…` van **todas o ninguna** (si falta alguna, la API no arranca y el log dice cuál). `Recuperacion__UrlBase` es obligatoria cuando el correo está configurado. Después de guardar, Railway vuelve a desplegar.

Para probar en tu computador: `dotnet user-secrets set "Correo:Gmail:ClientId" "<valor>" --project src/Presentation/Treeve.Api`, y lo mismo con `ClientSecret`, `RefreshToken`, `Remitente` y `Recuperacion:UrlBase`.

## 7. Prueba de punta a punta

1. Registra un usuario de prueba **con un correo tuyo**.
2. `POST /api/auth/recuperacion` con ese correo → 202. Debe llegar el correo (mira también spam).
3. Abre el enlace y llama a `POST /api/auth/recuperacion/restablecer` con el token y una contraseña nueva → 204.
4. Inicia sesión con la contraseña nueva. Elimina después el usuario de prueba.

## Si el correo no llega

Mira el log de Railway (la API responde 202 igual para no revelar si el correo existe):

| Mensaje en el log | Qué pasa |
|---|---|
| `El correo no está configurado` | Faltan las variables `Correo__Gmail__…` |
| `Google no entregó un access token (… invalid_grant)` | El refresh token venció o se revocó: repite el paso 5 (y confirma que la aplicación está "En producción") |
| `Google no entregó un access token (… invalid_client)` | El ID o el secreto del cliente están mal copiados |
| `Gmail rechazó el envío (HTTP 403 …)` | La Gmail API no está habilitada, o el scope `gmail.send` no se autorizó |
| `Gmail rechazó el envío (HTTP 429 …)` | Se pasó el límite diario de envíos |
