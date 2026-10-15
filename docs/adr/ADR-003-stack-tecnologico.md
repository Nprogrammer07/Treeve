# ADR-003 · Stack tecnológico

- **Estado:** Aceptado
- **Fecha:** 2026-10-13 (aclarado el 2026-10-14: stack y herramientas por separado)
- **Decisores:** Nicolás (arquitecto)
- **Historias relacionadas:** TEC-01, TEC-02, HU-07b

## Contexto

La arquitectura ya está decidida: Onion Architecture con eventos de dominio y bus en memoria (ADR-004). Faltaba elegir el lenguaje y los frameworks. Criterios: que la inyección de dependencias y las interfaces sean fáciles (los puertos del Onion), que la regla de dependencias se pueda verificar en CI y que el equipo domine las tecnologías en un plazo de 4 sprints de una semana.

## Decisión: stack

| Parte | Tecnologías |
|---|---|
| **Backend** | **C# sobre .NET 10 (LTS)**, con ASP.NET Core (el framework web de .NET) |
| **Frontend** | **React + TypeScript**, con **PixiJS** para el renderizado 2.5D |

Estas son las únicas tecnologías del stack. Todo el código de Treeve se escribe con ellas.

### Backend

- Un único host (`Treeve.Api`), desplegado como **backend propio**. Ni el frontend ni funciones de Supabase ejecutan lógica de negocio: todos los casos de uso y la autorización viven en el núcleo del backend.
- **Un proyecto por anillo del Onion** (ADR-004): `Treeve.Domain`, `Treeve.Domain.Services` y `Treeve.Application` en `src/Core`; `Treeve.Infrastructure` en `src/Infrastructure`; `Treeve.Api` en `src/Presentation`.

### Frontend

- `src/Presentation/Treeve.Web`: presentación, en el anillo externo del Onion (SPA desplegada aparte del backend).
- **PixiJS** dibuja la escena 2.5D (isométrica con sprites 2D y orden de profundidad). Queda encapsulado en `src/scene`.

## Herramientas de desarrollo (no forman parte del stack)

Son herramientas que compilan, prueban y verifican el código. No se programa "en" ellas ni cambian la arquitectura; se podrían reemplazar sin tocar el código de Treeve.

| Herramienta | Para qué | Por qué es necesaria |
|---|---|---|
| **Vite** | Compila TypeScript/JSX a JavaScript, empaqueta React y PixiJS para el navegador y sirve la app en desarrollo | El navegador no ejecuta TypeScript ni JSX. Vite es la herramienta que recomienda la documentación de React y la que usa la plantilla oficial de Microsoft "React y ASP.NET Core" |
| **Compilador de TypeScript (`tsc`)** | Verifica los tipos antes del build | Vite compila, pero no revisa tipos |
| **Vitest + Testing Library** | Pruebas del frontend (Vitest funciona sobre Vite) | DoD: pruebas automáticas |
| **Oxlint** (`jsx-a11y`) | Lint con reglas de accesibilidad en modo error | RNF de HU-04 y DoD |
| **dependency-cruiser** | Regla de dependencias del frontend: features aisladas, PixiJS solo en `src/scene`, ningún cliente de base de datos | Regla de dependencias verificada en CI (CLAUDE.md, sección 5) |
| **xUnit** | Pruebas del backend | DoD: pruebas automáticas |
| **ArchUnitNET** | Regla de dependencias del Onion en CI | Regla de dependencias verificada en CI (CLAUDE.md, sección 5) |
| **GitHub Actions** | Ejecuta todo lo anterior en cada PR | DoD: "CI en verde" |

En el backend, la regla de dependencias se cumple en dos niveles:

1. *Compilación:* las referencias entre proyectos solo apuntan hacia el centro. `Treeve.Domain` no referencia nada, así que una entidad no puede importar EF Core ni ASP.NET.
2. *CI:* `Treeve.ArchitectureTests` verifica que el núcleo no dependa de frameworks, ORM, SDK de Supabase, HTTP ni de `Microsoft.Extensions.*`, y que ningún anillo dependa de uno más externo (detalle en ADR-004).

Los paquetes NuGet tienen la versión centralizada en `Directory.Packages.props`.

## Convención de nombres

Dominio en español (`Nota`, `Arbol`, `CrearNota`, `RepositorioFragmentos`) para conservar la trazabilidad con historias, casos de uso UML y ADRs. Términos técnicos en inglés (`Domain`, `Application`, `Infrastructure`, `Endpoints`, `Composition`). Las interfaces llevan el prefijo `I` de C# (`IRepositorioNotas`).

## Pendiente (fuera de este ADR)

- Persistencia, cifrado y migraciones: **ADR-002** (TEC-06). Candidato natural en .NET: EF Core + Npgsql con migraciones versionadas en `Treeve.Infrastructure`.
- Proveedores de despliegue (Railway, Supabase PostgreSQL, Vercel): se confirman en TEC-02.

## Alternativas consideradas

| Alternativa | Motivo del descarte |
|---|---|
| TypeScript + NestJS en el backend | Un solo lenguaje, pero su DI con decoradores tiende a filtrarse a los casos de uso; el equipo eligió .NET |
| Java + Spring Boot | DI madura y ArchUnit, pero más pesado de arrancar para el equipo |
| Supabase Edge Functions como backend | Fragmenta la lógica por función y permite saltarse los casos de uso; incompatible con la Onion Architecture (el núcleo debe concentrar los casos de uso) |
| Three.js para la escena | 3D real, pero exige modelado 3D; PixiJS permite arte 2D isométrico más liviano para la meta de 30 FPS |
| Compilar el frontend solo con `tsc`, sin Vite | React tendría que cargarse desde un CDN externo (su paquete npm no trae módulos para navegador), sin recarga en caliente y con más configuración manual |

## Consecuencias

- **Positivas:** la regla de dependencias se cumple desde el compilador y además se verifica en CI; DI nativa de ASP.NET Core sin anotaciones en el núcleo; SDK LTS con soporte hasta 2028.
- **Negativas:** dos lenguajes (C# y TypeScript), así que los tipos de la API no se comparten. Mitigación prevista: generar el cliente del frontend desde OpenAPI cuando existan endpoints.
- **Riesgo:** el rendimiento 2.5D (≥ 30 FPS en gama media) se valida con el *spike* de HU-07b; si falla, el plan B del Sprint 2 se mantiene.
