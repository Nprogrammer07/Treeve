# Guía del backend · Cómo trabajar en la Onion Architecture

Para: desarrolladores backend de Treeve (Juan José y Nicolás).
Supone que conoces la teoría de Onion y Clean Architecture; aquí se explica **cómo se aplica en este repositorio**. La decisión completa está en [ADR-004](../adr/ADR-004-onion-architecture.md).

---

## Stack y herramientas

- **Stack:** C# sobre .NET 10, con ASP.NET Core para la API. No se agregan otros frameworks sin un ADR.
- **Herramientas (no son parte del stack):** xUnit para las pruebas y ArchUnitNET para verificar la regla de dependencias del Onion en CI. Se ejecutan con `dotnet test`.

---

## 1. Antes de empezar

1. Instala el [.NET SDK 10](https://dotnet.microsoft.com/download) y un IDE: Rider, Visual Studio 2026 o VS Code con C# Dev Kit.
2. Desde la raíz del repositorio, compila y corre las pruebas:

   ```bash
   dotnet build Treeve.slnx
   ```

   ```bash
   dotnet test Treeve.slnx
   ```

   Mientras `Treeve.Domain.Tests` y `Treeve.Application.Tests` estén vacíos verás el aviso "No hay ninguna prueba disponible". Es normal y desaparece con la primera prueba.
3. Levanta la API y abre `http://localhost:5242/health` (debe responder `Healthy`):

   ```bash
   dotnet run --project src/Presentation/Treeve.Api
   ```

---

## 2. El mapa: qué va en cada anillo

```
src/Core/Treeve.Domain              1 · Modelo de dominio       ← centro, no depende de nada
src/Core/Treeve.Domain.Services     2 · Servicios de dominio    → solo conoce 1
src/Core/Treeve.Application         3 · Servicios de aplicación → conoce 1 y 2
src/Infrastructure/Treeve.Infrastructure    Externo · implementa interfaces del núcleo
src/Presentation/Treeve.Api                 Externo · HTTP: endpoints, DTOs, composición
src/Presentation/Treeve.Web                 Externo · frontend React (ver guía del frontend)
```

| Anillo | Va aquí | No va aquí |
|---|---|---|
| **1 · `Treeve.Domain`** | Entidades (`Nota`, `Arbol`), objetos de valor (`TextoDesahogo`, `Emocion`), eventos de dominio (`NotaCreada`), excepciones de dominio, reglas de una sola entidad (`Arbol.Regar()`) | Interfaces de repositorio, `async` de base de datos, atributos de EF o JSON, `DateTime.Now`, `Random` |
| **2 · `Treeve.Domain.Services`** | Reglas que cruzan varias entidades (`MotorDeRespuesta`, umbrales de crecimiento si dependen de varios datos), **interfaces de repositorio** (`IRepositorioNotas`) | Orquestación de un flujo completo, autorización, cifrado |
| **3 · `Treeve.Application`** | Casos de uso (`CrearNota`, `LeerNota`, `GenerarMensajeApoyo`), **autorización**, manejadores de eventos (`AlCrearseNota` en EspacioVerde), puertos hacia servicios técnicos (`ICifradorDesahogos`, `IReloj`, `IPublicadorEventos`) | `ILogger`, `HttpContext`, `DbContext`, `IConfiguration`, DTOs HTTP |
| **`Treeve.Infrastructure`** | Implementaciones: repositorios (`Persistence/`), cifrado, bus de eventos en memoria, reloj del sistema; su registro en `DependencyInjection.cs` | Endpoints, reglas de negocio |
| **`Treeve.Api`** | Endpoints y DTOs (`Endpoints/{Area}/`), autenticación HTTP, registro de casos de uso (`Composition/`), `Program.cs` | Reglas de negocio, consultas a la base de datos, uso directo de repositorios |

### La regla de oro

**Las dependencias apuntan hacia el centro, y las interfaces se definen adentro y se implementan afuera.**

```
Treeve.Domain.Services                     define     IRepositorioNotas
Treeve.Infrastructure                      implementa RepositorioNotasPostgres : IRepositorioNotas
Treeve.Infrastructure/DependencyInjection  conecta    services.AddScoped<IRepositorioNotas, RepositorioNotasPostgres>()
Treeve.Application                         usa        CrearNota(IRepositorioNotas notas, ...)  ← nunca sabe que hay PostgreSQL
```

Los casos de uso se registran en `Treeve.Api/Composition/ApplicationServices.cs`. El núcleo no conoce el contenedor de dependencias.

No tienes que acordarte de memoria: **el compilador y la CI te frenan.**

- Las referencias entre proyectos solo apuntan hacia adentro. Si escribes `using Microsoft.EntityFrameworkCore;` en `Treeve.Domain`, no compila.
- `tests/Treeve.ArchitectureTests` falla en estos casos:
  - el núcleo usa ASP.NET, EF Core, Npgsql, Supabase, HTTP o `Microsoft.Extensions.*`;
  - un endpoint usa algo de `Treeve.Infrastructure`;
  - una interfaz `IRepositorio*` está fuera de `Domain.Services`;
  - creas un proyecto nuevo sin registrarlo en su anillo.

### Áreas funcionales = carpetas

Las áreas no son proyectos. Son carpetas que se repiten en cada anillo, y el namespace sigue la carpeta:

| Área | Ejemplo en el dominio |
|---|---|
| `Identidad` | `Treeve.Domain/Identidad/Usuario.cs` |
| `Desahogos` | `Treeve.Domain/Desahogos/Nota.cs` → `namespace Treeve.Domain.Desahogos;` |
| `EspacioVerde` | `Treeve.Domain/EspacioVerde/Arbol.cs` |
| `MensajesApoyo` | `Treeve.Domain/MensajesApoyo/Fragmento.cs` |
| `Sugerencias` | `Treeve.Domain/Sugerencias/Sugerencia.cs` |
| `Administracion` | `Treeve.Domain/Administracion/CambioDeRol.cs` |
| `Comun` | Piezas compartidas: `ExcepcionDeDominio`, `IReloj` |

Para que un área reaccione a lo que pasa en otra, usa **eventos de dominio**. Por ejemplo, EspacioVerde escucha `NotaCreada`; no llames su caso de uso desde Desahogos.

### Nombres

Dominio en español (`Nota`, `CrearNota`, `PerteneceA`), términos técnicos en inglés (`Endpoints`, `Composition`, `Persistence`). Las interfaces llevan el prefijo `I` de C#: `IRepositorioNotas`.

---

## 3. Paso a paso para implementar una historia

Trabaja **de adentro hacia afuera**: así cada paso compila y se prueba sin depender del siguiente.

1. **Lee los criterios de aceptación** (RF y RNF) en ClickUp y en `CLAUDE.md`, y anota qué reglas de negocio hay.
2. **Anillo 1:** crea entidades y objetos de valor con sus reglas. Escribe sus pruebas en `tests/Treeve.Domain.Tests/{Area}/`.
3. **Anillo 2:** define las interfaces de repositorio que vas a necesitar. Si una regla involucra varias entidades, crea un servicio de dominio y pruébalo también en `Treeve.Domain.Tests`.
4. **Anillo 3:** escribe el caso de uso. Debe orquestar, **autorizar** y publicar eventos. Pruébalo en `tests/Treeve.Application.Tests/{Area}/` con dobles de las interfaces (`tests/Treeve.Application.Tests/Dobles/`).
5. **Infraestructura:** implementa las interfaces en `Treeve.Infrastructure` y regístralas en `DependencyInjection.cs`. Mientras no esté aprobado ADR-002 (persistencia), usa implementaciones en memoria.
6. **Presentación:** crea el endpoint y sus DTOs en `Treeve.Api/Endpoints/{Area}/`, registra el caso de uso en `Composition/ApplicationServices.cs` y mapea el endpoint en `Program.cs`.
7. **Verifica** con `dotnet test Treeve.slnx` y abre el PR con la plantilla (checklist de arquitectura y Definition of Done).

---

## 4. Ejemplo guiado: HU-05 · Guardar un desahogo

Este código **compila y sus pruebas pasan** con la estructura actual. Úsalo como referencia, no lo copies sin revisar los criterios de la historia. El límite de 2000 caracteres es un valor de ejemplo; el cifrado real y la autenticación llegan con ADR-002 y HU-02/HU-03a.

### 4.1 Anillo 1 · Modelo de dominio

`src/Core/Treeve.Domain/Comun/ExcepcionDeDominio.cs`

```csharp
namespace Treeve.Domain.Comun;

/// <summary>Se lanza cuando se viola una regla de negocio. Su mensaje nunca incluye datos del usuario.</summary>
public sealed class ExcepcionDeDominio(string mensaje) : Exception(mensaje);
```

`src/Core/Treeve.Domain/Desahogos/Emocion.cs`

```csharp
namespace Treeve.Domain.Desahogos;

public enum Emocion
{
    Tristeza,
    Rabia,
    Miedo,
    Duda,
    Felicidad,
}
```

`src/Core/Treeve.Domain/Desahogos/TextoDesahogo.cs` es un objeto de valor: la regla del texto vive en un solo lugar.

```csharp
using Treeve.Domain.Comun;

namespace Treeve.Domain.Desahogos;

/// <summary>Texto en claro de un desahogo. Solo vive en memoria: se cifra antes de guardarse.</summary>
public sealed class TextoDesahogo
{
    /// <summary>Valor de ejemplo: el límite real lo define el PO en HU-05.</summary>
    public const int LongitudMaxima = 2000;

    public string Valor { get; }

    private TextoDesahogo(string valor) => Valor = valor;

    public static TextoDesahogo Crear(string texto)
    {
        if (string.IsNullOrWhiteSpace(texto))
        {
            throw new ExcepcionDeDominio("El desahogo no puede estar vacío.");
        }

        if (texto.Length > LongitudMaxima)
        {
            throw new ExcepcionDeDominio($"El desahogo supera los {LongitudMaxima} caracteres.");
        }

        return new TextoDesahogo(texto);
    }

    // Privacidad: si alguien lo escribe en un log por error, no se filtra el contenido.
    public override string ToString() => "[desahogo]";
}
```

`src/Core/Treeve.Domain/Desahogos/Nota.cs` es la entidad. El constructor es privado, la creación pasa por una fábrica y no tiene setters públicos.

```csharp
namespace Treeve.Domain.Desahogos;

/// <summary>Un desahogo guardado. El texto solo existe cifrado.</summary>
public sealed class Nota
{
    public Guid Id { get; }
    public Guid UsuarioId { get; }
    public Emocion Emocion { get; }
    public byte[] TextoCifrado { get; }
    public DateTimeOffset CreadaEn { get; }

    private Nota(Guid id, Guid usuarioId, Emocion emocion, byte[] textoCifrado, DateTimeOffset creadaEn)
    {
        Id = id;
        UsuarioId = usuarioId;
        Emocion = emocion;
        TextoCifrado = textoCifrado;
        CreadaEn = creadaEn;
    }

    public static Nota Crear(Guid usuarioId, Emocion emocion, byte[] textoCifrado, DateTimeOffset ahora) =>
        new(Guid.NewGuid(), usuarioId, emocion, textoCifrado, ahora);

    public bool PerteneceA(Guid usuarioId) => UsuarioId == usuarioId;

    public NotaCreada Creada() => new(Id, UsuarioId, Emocion, CreadaEn);
}
```

`src/Core/Treeve.Domain/Desahogos/NotaCreada.cs`

```csharp
namespace Treeve.Domain.Desahogos;

/// <summary>Evento de dominio. Solo IDs y metadatos: nunca el texto del desahogo.</summary>
public sealed record NotaCreada(Guid NotaId, Guid UsuarioId, Emocion Emocion, DateTimeOffset Fecha);
```

### 4.2 Anillo 2 · Servicios de dominio

`src/Core/Treeve.Domain.Services/Desahogos/IRepositorioNotas.cs`

```csharp
using Treeve.Domain.Desahogos;

namespace Treeve.Domain.Services.Desahogos;

public interface IRepositorioNotas
{
    Task Agregar(Nota nota, CancellationToken ct);

    Task<Nota?> ObtenerPorId(Guid notaId, CancellationToken ct);
}
```

Esta historia no necesita un servicio de dominio. Un ejemplo de cuándo sí: `MotorDeRespuesta` (ADR-001), que combina `Senales`, `Fragmento` y `EstrategiaPorEmocion`.

### 4.3 Anillo 3 · Servicios de aplicación

`src/Core/Treeve.Application/Comun/Puertos.cs` reúne los servicios técnicos que el núcleo necesita y que se implementan afuera.

```csharp
namespace Treeve.Application.Comun;

/// <summary>La hora actual llega desde afuera para que los casos de uso se puedan probar.</summary>
public interface IReloj
{
    DateTimeOffset Ahora { get; }
}

/// <summary>Bus de eventos de dominio (TEC-03). La implementación en memoria vive en Infrastructure.</summary>
public interface IPublicadorEventos
{
    Task Publicar<TEvento>(TEvento evento, CancellationToken ct)
        where TEvento : notnull;
}

public sealed class AccesoDenegado() : Exception("No tienes permiso para esta acción.");
```

`src/Core/Treeve.Application/Desahogos/ICifradorDesahogos.cs`

```csharp
using Treeve.Domain.Desahogos;

namespace Treeve.Application.Desahogos;

/// <summary>Cifrado en reposo (HU-05). La llave vive fuera de la base de datos (ADR-002).</summary>
public interface ICifradorDesahogos
{
    byte[] Cifrar(TextoDesahogo texto);

    TextoDesahogo Descifrar(byte[] textoCifrado);
}
```

`src/Core/Treeve.Application/Desahogos/CrearNota.cs` es el caso de uso. Solo orquesta: las reglas están en el dominio.

```csharp
using Treeve.Application.Comun;
using Treeve.Domain.Desahogos;
using Treeve.Domain.Services.Desahogos;

namespace Treeve.Application.Desahogos;

public sealed record CrearNotaComando(Emocion Emocion, string Texto)
{
    // Los records imprimen todas sus propiedades; aquí se oculta el texto.
    public override string ToString() => $"CrearNotaComando {{ Emocion = {Emocion} }}";
}

public sealed record NotaGuardada(Guid NotaId, DateTimeOffset CreadaEn);

/// <summary>HU-05: guarda un desahogo cifrado y avisa al resto del sistema con NotaCreada.</summary>
public sealed class CrearNota(
    IRepositorioNotas notas,
    ICifradorDesahogos cifrador,
    IReloj reloj,
    IPublicadorEventos eventos)
{
    public async Task<NotaGuardada> Ejecutar(Guid usuarioId, CrearNotaComando comando, CancellationToken ct)
    {
        var texto = TextoDesahogo.Crear(comando.Texto);
        var nota = Nota.Crear(usuarioId, comando.Emocion, cifrador.Cifrar(texto), reloj.Ahora);

        await notas.Agregar(nota, ct);
        await eventos.Publicar(nota.Creada(), ct);

        return new NotaGuardada(nota.Id, nota.CreadaEn);
    }
}
```

`src/Core/Treeve.Application/Desahogos/LeerNota.cs` muestra **dónde va la autorización**: en el caso de uso, no en el endpoint ni en el frontend.

```csharp
using Treeve.Application.Comun;
using Treeve.Domain.Services.Desahogos;

namespace Treeve.Application.Desahogos;

public sealed class LeerNota(IRepositorioNotas notas, ICifradorDesahogos cifrador)
{
    public async Task<string> Ejecutar(Guid usuarioId, Guid notaId, CancellationToken ct)
    {
        var nota = await notas.ObtenerPorId(notaId, ct);

        // Autorización en el caso de uso (HU-05): solo el propietario lee su desahogo.
        // Mismo error si no existe o no es suya, para no revelar que existe.
        if (nota is null || !nota.PerteneceA(usuarioId))
        {
            throw new AccesoDenegado();
        }

        return cifrador.Descifrar(nota.TextoCifrado).Valor;
    }
}
```

### 4.4 Anillo externo · Infraestructura

`src/Infrastructure/Treeve.Infrastructure/Persistence/RepositorioNotasEnMemoria.cs`

```csharp
using System.Collections.Concurrent;
using Treeve.Domain.Desahogos;
using Treeve.Domain.Services.Desahogos;

namespace Treeve.Infrastructure.Persistence;

/// <summary>Temporal hasta ADR-002: luego se reemplaza por EF Core + PostgreSQL sin tocar el núcleo.</summary>
public sealed class RepositorioNotasEnMemoria : IRepositorioNotas
{
    private readonly ConcurrentDictionary<Guid, Nota> notas = new();

    public Task Agregar(Nota nota, CancellationToken ct)
    {
        notas[nota.Id] = nota;
        return Task.CompletedTask;
    }

    public Task<Nota?> ObtenerPorId(Guid notaId, CancellationToken ct) =>
        Task.FromResult(notas.GetValueOrDefault(notaId));
}
```

Se registra en `src/Infrastructure/Treeve.Infrastructure/DependencyInjection.cs`, junto con las demás implementaciones (cifrador, reloj y bus) cuando existan:

```csharp
services.AddSingleton<IRepositorioNotas, RepositorioNotasEnMemoria>();
```

> El cifrador real (`ICifradorDesahogos`, por ejemplo con AES-GCM) se implementa aquí cuando ADR-002 defina dónde vive la llave. La llave **nunca** va en la base de datos ni en el código: llega por variable de entorno.

### 4.5 Anillo externo · Presentación HTTP

`src/Presentation/Treeve.Api/Endpoints/Desahogos/DesahogosEndpoints.cs` traduce entre HTTP y el caso de uso. Usa DTOs propios y nunca expone la entidad.

```csharp
using Treeve.Application.Desahogos;
using Treeve.Domain.Desahogos;

namespace Treeve.Api.Endpoints.Desahogos;

public sealed record CrearNotaRequest(string Emocion, string Texto)
{
    public override string ToString() => $"CrearNotaRequest {{ Emocion = {Emocion} }}";
}

public sealed record CrearNotaResponse(Guid NotaId, DateTimeOffset CreadaEn);

public static class DesahogosEndpoints
{
    public static IEndpointRouteBuilder MapDesahogosEndpoints(this IEndpointRouteBuilder app)
    {
        var grupo = app.MapGroup("/api/desahogos");

        grupo.MapPost("/", async (CrearNotaRequest request, CrearNota crearNota, HttpContext http, CancellationToken ct) =>
        {
            // Traducir HTTP → caso de uso. Nada de reglas de negocio aquí.
            if (!Enum.TryParse<Emocion>(request.Emocion, ignoreCase: true, out var emocion) || !Enum.IsDefined(emocion))
            {
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["emocion"] = ["Emoción no válida."] });
            }

            var usuarioId = http.User.ObtenerUsuarioId(); // Extensión que se crea con HU-02/HU-03a.
            var guardada = await crearNota.Ejecutar(usuarioId, new CrearNotaComando(emocion, request.Texto), ct);

            return Results.Created($"/api/desahogos/{guardada.NotaId}", new CrearNotaResponse(guardada.NotaId, guardada.CreadaEn));
        });

        return app;
    }
}
```

En `src/Presentation/Treeve.Api/Composition/ApplicationServices.cs`:

```csharp
services.AddScoped<CrearNota>();
services.AddScoped<LeerNota>();
```

Y en `src/Presentation/Treeve.Api/Program.cs`:

```csharp
app.MapDesahogosEndpoints();
```

### 4.6 Pruebas

`tests/Treeve.Domain.Tests/Desahogos/TextoDesahogoTests.cs` prueba código puro, sin dobles:

```csharp
using Treeve.Domain.Comun;
using Treeve.Domain.Desahogos;

namespace Treeve.Domain.Tests.Desahogos;

public class TextoDesahogoTests
{
    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Rechaza_un_desahogo_vacio(string texto)
    {
        Assert.Throws<ExcepcionDeDominio>(() => TextoDesahogo.Crear(texto));
    }

    [Fact]
    public void Rechaza_un_desahogo_que_supera_el_limite()
    {
        var demasiadoLargo = new string('a', TextoDesahogo.LongitudMaxima + 1);

        Assert.Throws<ExcepcionDeDominio>(() => TextoDesahogo.Crear(demasiadoLargo));
    }

    [Fact]
    public void No_expone_el_contenido_al_convertirse_en_texto()
    {
        var texto = TextoDesahogo.Crear("texto de prueba");

        Assert.DoesNotContain("texto de prueba", texto.ToString(), StringComparison.Ordinal);
    }
}
```

`tests/Treeve.Application.Tests/Dobles/Dobles.cs` tiene implementaciones falsas de las interfaces, para probar casos de uso sin base de datos:

```csharp
using System.Text;
using Treeve.Application.Comun;
using Treeve.Application.Desahogos;
using Treeve.Domain.Desahogos;
using Treeve.Domain.Services.Desahogos;

namespace Treeve.Application.Tests.Dobles;

internal sealed class RepositorioNotasFalso : IRepositorioNotas
{
    public List<Nota> Guardadas { get; } = [];

    public Task Agregar(Nota nota, CancellationToken ct)
    {
        Guardadas.Add(nota);
        return Task.CompletedTask;
    }

    public Task<Nota?> ObtenerPorId(Guid notaId, CancellationToken ct) =>
        Task.FromResult(Guardadas.SingleOrDefault(n => n.Id == notaId));
}

internal sealed class PublicadorEventosFalso : IPublicadorEventos
{
    public List<object> Publicados { get; } = [];

    public Task Publicar<TEvento>(TEvento evento, CancellationToken ct)
        where TEvento : notnull
    {
        Publicados.Add(evento);
        return Task.CompletedTask;
    }
}

internal sealed class RelojFijo(DateTimeOffset ahora) : IReloj
{
    public DateTimeOffset Ahora => ahora;
}

/// <summary>Invierte el texto: basta para comprobar que no se guarda en claro.</summary>
internal sealed class CifradorFalso : ICifradorDesahogos
{
    public byte[] Cifrar(TextoDesahogo texto) => Encoding.UTF8.GetBytes(new string([.. texto.Valor.Reverse()]));

    public TextoDesahogo Descifrar(byte[] textoCifrado) =>
        TextoDesahogo.Crear(new string([.. Encoding.UTF8.GetString(textoCifrado).Reverse()]));
}
```

`tests/Treeve.Application.Tests/Desahogos/CrearNotaTests.cs`

```csharp
using System.Text;
using Treeve.Application.Desahogos;
using Treeve.Application.Tests.Dobles;
using Treeve.Domain.Desahogos;

namespace Treeve.Application.Tests.Desahogos;

public class CrearNotaTests
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 14, 22, 30, 0, TimeSpan.FromHours(-5));

    private readonly RepositorioNotasFalso notas = new();
    private readonly PublicadorEventosFalso eventos = new();
    private readonly CrearNota crearNota;

    public CrearNotaTests() =>
        crearNota = new CrearNota(notas, new CifradorFalso(), new RelojFijo(Ahora), eventos);

    [Fact]
    public async Task Guarda_la_nota_con_el_texto_cifrado()
    {
        var usuarioId = Guid.NewGuid();

        var guardada = await crearNota.Ejecutar(usuarioId, new CrearNotaComando(Emocion.Tristeza, "texto de prueba"), CancellationToken.None);

        var nota = Assert.Single(notas.Guardadas);
        Assert.Equal(guardada.NotaId, nota.Id);
        Assert.Equal(usuarioId, nota.UsuarioId);
        Assert.NotEqual("texto de prueba", Encoding.UTF8.GetString(nota.TextoCifrado));
    }

    [Fact]
    public async Task Publica_NotaCreada_solo_con_ids_y_metadatos()
    {
        var usuarioId = Guid.NewGuid();

        var guardada = await crearNota.Ejecutar(usuarioId, new CrearNotaComando(Emocion.Rabia, "texto de prueba"), CancellationToken.None);

        var evento = Assert.Single(eventos.Publicados);
        Assert.Equal(new NotaCreada(guardada.NotaId, usuarioId, Emocion.Rabia, Ahora), evento);
    }
}
```

---

## 5. Reglas no negociables

1. **Privacidad de los desahogos.** El texto nunca va a logs, eventos, mensajes de error, respuestas de staff ni datos de prueba reales. Todo tipo que lleve el texto sobrescribe `ToString()`. El "tema" que detecta el motor de respuestas nunca se guarda.
2. **Autorización en el caso de uso**, en cada petición. El frontend puede ocultar botones, pero quien decide es `Application`.
3. **Los eventos llevan solo IDs y metadatos**, y sus manejadores son idempotentes: un evento repetido no hace crecer el árbol dos veces.
4. **La base de datos solo cambia con migraciones versionadas** (se definen en ADR-002), siempre en `Treeve.Infrastructure`.
5. **No uses IA para los mensajes de apoyo** (ADR-001). El motor es un servicio de dominio puro que recibe la semilla aleatoria como parámetro.
6. **No inventes líneas de ayuda.** Deja `TODO: verificar líneas de ayuda de Colombia` hasta que el equipo las confirme.
7. **No crees proyectos nuevos sin hablarlo con el arquitecto.** Si hace falta uno, se propone un ADR y se registra en `ArquitecturaTreeve.CarpetaDeCadaProyecto`.

---

## 6. Errores comunes

| Error | Por qué está mal | Qué hacer |
|---|---|---|
| Poner `[Key]`, `[Table]` o `[JsonPropertyName]` en una entidad | Acopla el dominio a EF o a HTTP (y no compila: el dominio no los conoce) | Mapear con la configuración de EF en `Infrastructure` y usar DTOs en `Api` |
| Un endpoint que recibe `IRepositorioNotas` o un `DbContext` | Se salta el caso de uso y su autorización (la CI falla) | El endpoint recibe el caso de uso (`CrearNota`) |
| Un `if` de reglas de negocio en el endpoint (umbrales, permisos) | La regla queda fuera del núcleo y sin pruebas | Moverlo a la entidad, al servicio de dominio o al caso de uso |
| Entidades con `{ get; set; }` públicos | Cualquiera las deja en un estado inválido | Constructor privado, fábrica que valida y métodos con intención (`Arbol.Regar()`) |
| Devolver la entidad en la respuesta HTTP | Expone datos internos (por ejemplo `TextoCifrado`) | Un DTO de respuesta |
| `DateTime.Now` o `new Random()` dentro del núcleo | No se puede probar | Recibir `IReloj` o la semilla como parámetro |
| `ILogger` en un caso de uso | El núcleo no conoce `Microsoft.Extensions` (la CI falla) y aumenta el riesgo de registrar el texto | Registrar en el anillo externo y sin datos del desahogo |
| Que un área llame directamente al caso de uso de otra | Acopla áreas | Publicar un evento de dominio y manejarlo en la otra área |

---

## 7. Antes de abrir el PR

- [ ] La rama y los commits llevan el ID: `hu-05-escritura`, `HU-05: cifra el desahogo antes de guardarlo`.
- [ ] `dotnet test Treeve.slnx` está en verde, incluidas las pruebas de arquitectura.
- [ ] Cada regla de negocio tiene su prueba en `Treeve.Domain.Tests` o `Treeve.Application.Tests`.
- [ ] Ningún tipo con el texto del desahogo lo imprime en `ToString()`, logs ni errores.
- [ ] Completaste la plantilla del PR (checklist de arquitectura y Definition of Done).
