# Despliegue del frontend (Vercel)

El frontend (`src/Presentation/Treeve.Web`) se despliega en **Vercel** y la API está en **Railway** (ADR-003 y ADR-005). Viven en dominios distintos, así que hay que configurar dos cosas: la dirección de la API en el frontend y el permiso de CORS en la API.

> La API de producción está en `https://treeve-production.up.railway.app`. Ese es el valor de `VITE_API_URL`.

## 1. Crear el proyecto en Vercel

1. En Vercel: **Add New → Project** e importar el repositorio de GitHub.
2. **Root Directory:** `src/Presentation/Treeve.Web`.
3. **Framework Preset:** Vite (se detecta solo). Comando de build `npm run build` y carpeta de salida `dist`.
4. **Environment Variables:** `VITE_API_URL` = la URL pública de la API en Railway, sin barra final (`https://treeve-production.up.railway.app`).
5. **Deploy.** Vercel entrega una dirección del tipo `https://tu-frontend.vercel.app`.

`VITE_API_URL` se fija al compilar: si se cambia, hay que volver a desplegar el frontend.

## 2. Permitir el frontend en la API (CORS)

En Railway, en las variables del servicio de la API, agregar:

| Variable | Valor |
|---|---|
| `Cors__Origenes__0` | `https://tu-frontend.vercel.app` (sin barra final) |

Después hay que reiniciar o volver a desplegar la API para que la lea. Si luego se agrega un dominio propio, se suma como `Cors__Origenes__1`.

## 3. Comprobar

- Abrir la dirección de Vercel y registrarse: debe quedar la sesión abierta y mostrarse la elección de emoción.
- Cerrar la pestaña y probar **Iniciar sesión** con el mismo usuario.
- Si el navegador muestra un error de CORS, el valor de `Cors__Origenes__0` no coincide exactamente con la dirección del frontend.

## Notas

- En un proyecto nuevo, Vercel puede proteger las direcciones `*.vercel.app` con un inicio de sesión de Vercel; para que el sitio sea público hay que desactivar *Deployment Protection* en los ajustes del proyecto.
- La API solo acepta conexiones HTTPS (ADR-005): `VITE_API_URL` debe empezar por `https://`.
- Para probar contra la API de Railway desde `localhost`, hay que agregar `http://localhost:5173` temporalmente a `Cors__Origenes`.

## Enlace del correo de recuperación (`/restablecer-contrasena`, HU-03b)

El correo de recuperación trae un botón que abre `<Recuperacion__UrlBase>?token=…`. Hay que configurar dos cosas **antes** de probarlo en el sitio publicado:

1. **En Railway (API):** la variable `Recuperacion__UrlBase` con la dirección completa de la pantalla, por ejemplo `https://treeve.onrender.com/restablecer-contrasena` (sin `?token=`, sin barra final). La API la lee al arrancar: hay que reiniciarla.
2. **En Render (sitio estático):** como el frontend es una sola página, el servidor debe devolver `index.html` cuando alguien abre `/restablecer-contrasena` directamente; si no, el enlace del correo responde "Not Found". En *Redirects/Rewrites* agregar una regla de tipo **Rewrite** con origen `/*` y destino `/index.html`, y comprobar después que la página principal y esa dirección cargan sus archivos con normalidad.

La pantalla lee el token una sola vez, lo borra de la barra de direcciones y lo guarda solo en memoria. No se escribe en consola, ni en logs, ni en ningún almacenamiento del navegador. Al cambiar la contraseña la API cierra todas las sesiones, y la interfaz olvida la sesión guardada en el navegador.

En desarrollo (`npm run dev`) no hace falta nada: Vite responde `index.html` en cualquier ruta.

## Zona de staff (`/staff`)

La zona de staff vive en la dirección `/staff` (HU-10), sin enlaces desde la experiencia de la persona usuaria. Necesita la **misma regla de Render** de la sección anterior (*Rewrite* de `/*` a `/index.html`): sin ella, abrir `/staff` directamente responde "Not Found".

- **Vercel:** necesita una regla equivalente en un archivo `vercel.json`, que hoy la prueba de estructura de la CI no admite en la carpeta del frontend. Hay que hablarlo con el arquitecto antes de agregarlo.
- **En desarrollo** (`npm run dev`) no hace falta nada.

La API valida el rol en cada petición (ver `api-staff.md`): quien abra `/staff` sin ser staff verá "Acceso denegado" y la API registrará el intento.
