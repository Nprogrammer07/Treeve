# ADR-002 · Persistencia

- **Estado:** Aceptado (2026-10-16)
- **Fecha:** 2026-10-15
- **Decisores:** Nicolás (arquitecto), Juan José (backend)
- **Historias relacionadas:** TEC-02, TEC-06, HU-02, HU-05

## Contexto

CLAUDE.md (sección 7) lista los puntos que ADR-002 debe cerrar antes de crear tablas: quién accede a la base de datos, dónde vive la llave de cifrado, cómo se organizan las tablas y cómo se versionan los cambios. TEC-02 necesita una base de datos creada, un sistema de migraciones y el backend desplegado con HTTPS.

Restricciones que ya existen en el repositorio:

- El backend es C# / .NET 10 con Onion Architecture (ADR-003, ADR-004). El núcleo no puede usar EF Core, Npgsql ni SDK de Supabase.
- `EstructuraDelRepositorioTests` solo admite `.cs`, `.csproj` y configuración de ASP.NET Core dentro de `src/` y `tests/`. Los scripts `.sql` no caben en esa estructura.
- Las contraseñas con hash y salt, el bloqueo tras 5 intentos y el RBAC viven en el backend (HU-02, HU-03a, HU-10). No se usa Supabase Auth.

## Decisión

1. **Solo el backend accede a PostgreSQL.** `Treeve.Api` es el único cliente de la base de datos. Supabase se usa solo como PostgreSQL administrado: no se usan sus SDK ni las claves `anon` o `service_role`. Las tablas viven en un esquema propio, `treeve`, que no está expuesto en la Data API de Supabase (que publica `public`). Cada tabla nueva se crea con RLS habilitado y sin políticas, y sin permisos para `anon` ni `authenticated`, como defensa en profundidad.
2. **Cifrado de los desahogos en la aplicación.** AES-256-GCM detrás del puerto `ICifradorDesahogos` (anillo Application), implementado en `Treeve.Infrastructure`. La llave (32 bytes en Base64) llega por la variable de entorno `Cifrado__Llave`, nunca vive en la base de datos ni en el repositorio. El valor guardado lleva un byte de versión para poder rotar la llave. Se almacena en una columna `bytea`.
3. **Organización de tablas.** Un único esquema `treeve`. Los nombres de las tablas los define cada historia al crearla (HU-02: usuarios; HU-05: desahogos). Si el volumen de tablas crece, se revisa un esquema por área funcional en un ADR nuevo.
4. **Migraciones con EF Core + Npgsql** (candidata de ADR-003), escritas en C# dentro de `Treeve.Infrastructure/Persistence/Migrations`. Es la única vía para cambiar la base de datos. Una migración por historia; una migración ya aplicada no se edita, se agrega otra. En el entorno compartido se aplican al arrancar la API con `Persistencia__AplicarMigraciones=true`.
5. **Conexión.** Cadena en `ConnectionStrings__Treeve`, como secreto del entorno, con SSL obligatorio. Para el despliegue se usa el *Session pooler* de Supabase (compatible con IPv4) porque la conexión directa solo funciona por IPv6.
6. **Datos y registros.** El texto de un desahogo y el tema detectado nunca se guardan en claro ni en logs. Los logs de comandos de EF Core quedan en nivel `Warning` y `EnableSensitiveDataLogging` está prohibido.
7. **Despliegue de TEC-02.** Backend en Railway, construido con un `Dockerfile` (Railpack no soporta .NET: su documentación exige Dockerfile). El archivo vive en `deploy/Dockerfile`, la carpeta de despliegue habilitada en las pruebas de estructura, y Railway lo toma con la variable `RAILWAY_DOCKERFILE_PATH=deploy/Dockerfile`. Railway termina TLS: la API confía en `X-Forwarded-Proto` y envía HSTS fuera de desarrollo.

## Alternativas consideradas

| Alternativa | Motivo del descarte |
|---|---|
| Frontend o backend usando el SDK de Supabase / PostgREST | Salta los casos de uso y su autorización; el núcleo no puede conocer el SDK (ADR-003) |
| Supabase Auth para registro y login | HU-02, HU-03a y HU-10 exigen hash, bloqueo y RBAC validados en el casos de uso del backend |
| Scripts SQL versionados (`supabase/migrations`) | `.sql` no está permitido en la estructura; cambiarla exige modificar las pruebas de arquitectura |
| Cifrado con `pgcrypto` en la base de datos | La llave y el texto pasarían por la base de datos, contra el punto 2 de CLAUDE.md sección 7 |
| Dapper con SQL manual | Sin historial de migraciones integrado; más código fuera del modelo |
| `Dockerfile` en la raíz del repositorio o en `.github/` | La raíz quedaría sin reglas para archivos de despliegue y `.github/` es solo para la configuración de GitHub; se eligió una carpeta explícita, `deploy/`, con su propia regla |

## Consecuencias

- **Positivas:** una sola vía de acceso a los datos; la llave nunca comparte lugar con los datos cifrados; el historial de migraciones queda en el repositorio y lo revisa la CI.
- **Negativas:** el backend depende de EF Core y Npgsql (paquetes nuevos, con aprobación del arquitecto por `CODEOWNERS`); Railway necesita un archivo auxiliar (`deploy/Dockerfile`) fuera de `src/`.
- **Verificación:** `dotnet test Treeve.slnx` (reglas del Onion y estructura); `GET /health/ready` responde 200 solo si la API conecta con la base de datos; el esquema `treeve` no aparece en la Data API de Supabase.

## Pendiente

- Definir un rol de base de datos con permisos mínimos para la aplicación (las migraciones usarían el rol dueño).
- Confirmar el proveedor del frontend (Vercel) en la parte de TEC-02 que lo despliega.
- Definir el procedimiento de rotación de `Cifrado__Llave` junto con HU-05.
