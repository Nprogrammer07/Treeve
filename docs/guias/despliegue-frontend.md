# Despliegue del frontend (Vercel)

El frontend (`src/Presentation/Treeve.Web`) se despliega en **Vercel** y la API está en **Railway** (ADR-003 y ADR-005). Viven en dominios distintos, así que hay que configurar dos cosas: la dirección de la API en el frontend y el permiso de CORS en la API.

## 1. Crear el proyecto en Vercel

1. En Vercel: **Add New → Project** e importar el repositorio de GitHub.
2. **Root Directory:** `src/Presentation/Treeve.Web`.
3. **Framework Preset:** Vite (se detecta solo). Comando de build `npm run build` y carpeta de salida `dist`.
4. **Environment Variables:** `VITE_API_URL` = la URL pública de la API en Railway, sin barra final (por ejemplo `https://tu-api.up.railway.app`).
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
