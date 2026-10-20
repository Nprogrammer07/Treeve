# Treeve

Aplicación web de bienestar emocional con estética de videojuego relajante: eliges la emoción que sientes, escribes un desahogo en una hoja de papel, recibes un mensaje de apoyo y tu árbol crece en tu espacio verde.

Proyecto académico de Arquitectura de Software. El contexto completo (requisitos, drivers, backlog y Definition of Done) está en [CLAUDE.md](CLAUDE.md), y las decisiones de arquitectura en [docs/adr](docs/adr/README.md).

**¿Vas a empezar a desarrollar?** Lee primero la guía de tu parte:

- [Guía del backend](docs/guias/backend.md)
- [Guía del frontend](docs/guias/frontend.md)

## Arquitectura: Onion

El backend y el frontend forman una sola **Onion Architecture** ([ADR-004](docs/adr/ADR-004-onion-architecture.md)). El modelo de dominio está en el centro y **todas las dependencias apuntan hacia adentro**. El frontend es presentación y vive en el anillo externo, igual que la API HTTP y la infraestructura.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Anillo externo                                                           │
│  Presentación: Treeve.Api (HTTP) · Treeve.Web (React)                    │
│  Infraestructura: Treeve.Infrastructure        Pruebas: tests/           │
│   ┌──────────────────────────────────────────────────────────────────┐   │
│   │ 3 · Servicios de aplicación: Treeve.Application                  │   │
│   │   ┌──────────────────────────────────────────────────────────┐   │   │
│   │   │ 2 · Servicios de dominio: Treeve.Domain.Services         │   │   │
│   │   │   ┌──────────────────────────────────────────────────┐   │   │   │
│   │   │   │ 1 · Modelo de dominio: Treeve.Domain             │   │   │   │
│   │   │   └──────────────────────────────────────────────────┘   │   │   │
│   │   └──────────────────────────────────────────────────────────┘   │   │
│   └──────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

```
Treeve/
├── Treeve.slnx                        # Solución .NET (incluye Treeve.Web como elementos de solución)
├── src/
│   ├── Core/                          # Núcleo: no conoce frameworks ni base de datos
│   │   ├── Treeve.Domain/             # 1 · Entidades, objetos de valor, eventos de dominio
│   │   ├── Treeve.Domain.Services/    # 2 · Servicios de dominio e interfaces de repositorio
│   │   └── Treeve.Application/        # 3 · Casos de uso, autorización, puertos
│   ├── Infrastructure/
│   │   └── Treeve.Infrastructure/     # Externo · Repositorios, cifrado, bus de eventos
│   └── Presentation/
│       ├── Treeve.Api/                # Externo · Endpoints HTTP, DTOs, composición
│       └── Treeve.Web/                # Externo · Frontend React + PixiJS
├── tests/
│   ├── Treeve.Domain.Tests/           # Reglas de negocio (anillos 1 y 2)
│   ├── Treeve.Application.Tests/      # Casos de uso con dobles de prueba
│   └── Treeve.ArchitectureTests/      # Regla de dependencias verificada en CI
├── deploy/                            # Externo · Dockerfile de Treeve.Api (Railway, ADR-002)
├── docs/
│   ├── adr/                           # Decisiones de arquitectura
│   └── guias/                         # Guías para el equipo
└── .github/                           # CI y plantilla de PR
```

Las áreas funcionales (Identidad, Desahogos, EspacioVerde, MensajesApoyo, Sugerencias, Administracion) **son carpetas dentro de cada anillo**, no proyectos. Por ejemplo: `Treeve.Domain/Desahogos/Nota.cs`.

### Cómo se hace cumplir

| Regla | Dónde se verifica |
|---|---|
| Cada anillo solo referencia anillos interiores | Compilación (referencias entre proyectos) |
| El núcleo no usa ASP.NET, EF Core, Npgsql, Supabase, HTTP ni `Microsoft.Extensions.*` | [`Treeve.ArchitectureTests`](tests/Treeve.ArchitectureTests) |
| Ningún anillo depende de uno más externo; la infraestructura no conoce la presentación | `Treeve.ArchitectureTests` |
| Los endpoints no usan la infraestructura (solo `Composition/` la conoce) | `Treeve.ArchitectureTests` |
| Las interfaces `IRepositorio*` viven en `Treeve.Domain.Services` | `Treeve.ArchitectureTests` |
| Cada proyecto vive en la carpeta de su anillo | `Treeve.ArchitectureTests` |
| `.github/`, `deploy/` y `docs/` solo contienen lo suyo (ninguna carpeta es un comodín) | `Treeve.ArchitectureTests` |
| No hay código fuera de los anillos (nada de `backend/` u otras carpetas paralelas) | `Treeve.ArchitectureTests` |
| El backend es solo C# y el frontend solo TypeScript (ADR-003); ningún `.cs` queda fuera de un proyecto | `Treeve.ArchitectureTests` |
| Cambiar estas reglas, el CI, los ADRs o las dependencias requiere aprobación del arquitecto | [`CODEOWNERS`](.github/CODEOWNERS) + protección de `main` |
| El frontend no usa clientes de base de datos, PixiJS solo en `src/scene`, features aisladas | [dependency-cruiser](src/Presentation/Treeve.Web/.dependency-cruiser.cjs) |

## Requisitos

- [.NET SDK 10](https://dotnet.microsoft.com/download) (ver `global.json`)
- [Node.js 24](https://nodejs.org/) (ver `src/Presentation/Treeve.Web/.nvmrc`)

## Cómo ejecutarlo

La API necesita una base de datos: sin la cadena de conexión no arranca (ADR-002). La primera vez, guarda la cadena de la base de **desarrollo** en tus secretos locales, que quedan fuera del repositorio. Pídesela a Juan José por un canal privado; nunca uses la de producción ni la pegues en el repositorio, ClickUp o un PR:

```bash
dotnet user-secrets set "ConnectionStrings:Treeve" "<cadena de desarrollo>" --project src/Presentation/Treeve.Api
```

También necesita la llave de cifrado de los datos sensibles (ADR-002), una por entorno. Genera la tuya de desarrollo y guárdala igual; sin ella la API no arranca:

```powershell
$b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
```

```bash
dotnet user-secrets set "Cifrado:Llave" "<llave en Base64>" --project src/Presentation/Treeve.Api
```

API (en `http://localhost:5242`; `/health` dice si el proceso vive y `/health/ready` si llega a la base de datos):

```bash
dotnet run --project src/Presentation/Treeve.Api
```

Frontend (en `http://localhost:5173`; reenvía `/api` a la API):

```bash
npm --prefix src/Presentation/Treeve.Web install
```

```bash
npm --prefix src/Presentation/Treeve.Web run dev
```

## Pruebas (lo mismo que corre la CI)

```bash
dotnet test Treeve.slnx
```

```bash
npm --prefix src/Presentation/Treeve.Web run check
```

`check` ejecuta lint (con accesibilidad), reglas de dependencias, pruebas y build.

## Cómo trabajamos

- **Una rama y un PR por historia**, con el ID del backlog en el nombre (`hu-02-registro`) y en los commits (`HU-02: valida la política de contraseña`).
- El PR usa la [plantilla con el checklist de arquitectura](.github/pull_request_template.md) y requiere la aprobación de otra persona.
- **Cambios de base de datos solo mediante migraciones versionadas** (se definen en ADR-002).
- Si un cambio toca una decisión de arquitectura (por ejemplo, un proyecto nuevo), primero se propone un ADR en `docs/adr`.
- Recursos de terceros (ilustraciones, íconos, sonidos, fuentes) solo con licencia de uso libre, registrada en el repositorio.
