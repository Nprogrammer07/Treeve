# ADR-004 · Onion Architecture

- **Estado:** Aceptado
- **Fecha:** 2026-10-14
- **Decisores:** Nicolás (arquitecto)
- **Historias relacionadas:** TEC-01 y todas las historias de implementación
- **Corrige:** la mención a "monolito modular con Clean Architecture por módulo" del documento de contexto (CLAUDE.md, secciones 5 y 13) y la primera estructura de TEC-01, que se armó con base en ella.

## Contexto

Treeve prioriza la **modificabilidad** (crecer con módulos de bienestar sin reescribir el núcleo) y la **privacidad** de los desahogos. Se construye con un equipo de 3 personas en 4 sprints, y su objetivo académico exige una arquitectura de la familia Clean, explícita y verificable. El estilo elegido es **Onion Architecture** (Jeffrey Palermo): el modelo de dominio está en el centro y todas las dependencias apuntan hacia él.

## Decisión

### Anillos

| Anillo | Proyecto | Carpeta | Contiene |
|---|---|---|---|
| 1 · Modelo de dominio (centro) | `Treeve.Domain` | `src/Core` | Entidades, objetos de valor, eventos de dominio |
| 2 · Servicios de dominio | `Treeve.Domain.Services` | `src/Core` | Reglas que involucran varias entidades e **interfaces de repositorio** |
| 3 · Servicios de aplicación | `Treeve.Application` | `src/Core` | Casos de uso, autorización, manejadores de eventos y puertos hacia servicios externos (cifrado, reloj, bus de eventos) |
| Externo · Infraestructura | `Treeve.Infrastructure` | `src/Infrastructure` | Implementaciones: repositorios con la base de datos, cifrado, bus de eventos en memoria |
| Externo · Presentación HTTP | `Treeve.Api` | `src/Presentation` | Endpoints, DTOs y composición de dependencias |
| Externo · Presentación web | `Treeve.Web` (React) | `src/Presentation` | Interfaz de usuario y escena 2.5D |
| Externo · Pruebas | `Treeve.*.Tests` | `tests` | Pruebas unitarias y de arquitectura |

### Reglas

1. **Las dependencias apuntan hacia el centro.** Un anillo solo conoce los anillos interiores.
2. **Las interfaces se definen adentro y se implementan afuera.** Por ejemplo, `IRepositorioNotas` vive en `Domain.Services` y su implementación en `Infrastructure`.
3. **El núcleo** (anillos 1 a 3) **no usa frameworks**: nada de ASP.NET, EF Core, Npgsql, SDK de Supabase, HTTP ni `Microsoft.Extensions.*`.
4. **La infraestructura no conoce la presentación** y la presentación no usa la infraestructura salvo para componer dependencias (`Treeve.Api/Composition` y `Program.cs`). Un endpoint siempre llama a un caso de uso.
5. **El frontend es presentación.** Depende del núcleo solo a través del contrato HTTP de `Treeve.Api` y no implementa reglas de negocio (crecimiento del árbol, detección de crisis, armado del mensaje de apoyo, permisos). El núcleo no sabe que el frontend existe.
6. **Las áreas funcionales son carpetas, no proyectos.** Identidad, Desahogos, EspacioVerde, MensajesApoyo, Sugerencias y Administracion aparecen como carpetas (y espacios de nombres) dentro de cada anillo, por ejemplo `Treeve.Domain/Desahogos/Nota.cs`.
7. **Eventos de dominio:** se definen en `Domain`, el bus es un puerto de `Application` con implementación en memoria en `Infrastructure`, y los manejadores viven en `Application`. Llevan solo IDs y metadatos, nunca el texto de un desahogo.

### Contenedores (C4)

SPA (`Treeve.Web`) → API (`Treeve.Api`, que contiene el núcleo y la infraestructura) → PostgreSQL. Un solo backend desplegable.

### Verificación

- **Compilación:** las referencias entre proyectos solo apuntan hacia adentro. `Treeve.Domain` no referencia nada.
- **CI:** `tests/Treeve.ArchitectureTests` (ArchUnitNET) verifica las reglas 1 a 4, que las interfaces `IRepositorio*` vivan en `Domain.Services` y que cada proyecto esté en la carpeta de su anillo.
- **Frontend:** `dependency-cruiser` impide clientes de base de datos en el frontend, PixiJS fuera de `src/scene` e importaciones cruzadas entre features.

## Alternativas consideradas

| Alternativa | Motivo del descarte |
|---|---|
| Clean Architecture por módulos (primera estructura de TEC-01: 6 módulos × 3 capas) | Partía de una decisión que no se tomó (monolito modular); 19 proyectos y fronteras entre módulos que el proyecto no necesita |
| Hexagonal | Ya descartada (CLAUDE.md, sección 5) |
| Capas tradicionales (presentación → negocio → datos) | El dominio queda acoplado a la persistencia; la dependencia apunta a la base de datos y no al dominio |

## Consecuencias

- **Positivas:** los anillos del modelo teórico se ven en la estructura del repositorio y se verifican en CI; el dominio no depende de nada; hay menos proyectos que mantener; un módulo futuro (pareja, resumen mensual) entra como un área nueva en cada anillo y como suscriptor de eventos.
- **Negativas:** dentro de un anillo no hay frontera dura entre áreas (una entidad de EspacioVerde podría usar una de Desahogos). Se mitiga con carpetas por área y revisión de PR, y la comunicación entre áreas se hace preferiblemente con eventos.
- **Pendiente:** ADR-002 debe revisar el punto 3 ("tablas organizadas por módulo") a la luz de esta decisión, por ejemplo con un esquema por área.
