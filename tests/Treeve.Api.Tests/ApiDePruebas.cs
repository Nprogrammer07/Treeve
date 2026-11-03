using System.Collections.Concurrent;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Npgsql;
using Treeve.Api.Errores;

namespace Treeve.Api.Tests;

/// <summary>
/// La API completa (middlewares, autenticación, filtros de rol, casos de uso, cifrado y repositorios) levantada en memoria,
/// como en producción: entorno "Production" y HTTPS obligatorio. La base es una PostgreSQL de usar y tirar, con nombre único,
/// creada en el servidor de <see cref="Variable"/> y borrada al terminar. Nunca apunta a Supabase.
/// Guarda todo lo que la API escribe en el log, en cualquier nivel, para comprobar que nunca aparece el texto de un desahogo.
/// </summary>
public sealed class ApiDePruebas : WebApplicationFactory<ManejadorDeExcepciones>, IAsyncLifetime
{
    public const string Variable = "TREEVE_PRUEBAS_POSTGRES";

    private readonly string? servidor = Environment.GetEnvironmentVariable(Variable);
    private readonly string nombre = $"treeve_api_pruebas_{Guid.NewGuid():N}";

    /// <summary>En la CI (GitHub pone CI=true) estas pruebas nunca se saltan: si falta el servidor, fallan.</summary>
    public static bool Disponible =>
        !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(Variable)) ||
        string.Equals(Environment.GetEnvironmentVariable("CI"), "true", StringComparison.OrdinalIgnoreCase);

    public RegistroDeLogs Logs { get; } = new();

    private string CadenaDeConexion => new NpgsqlConnectionStringBuilder(servidor) { Database = nombre }.ConnectionString;

    public async Task InitializeAsync()
    {
        if (string.IsNullOrWhiteSpace(servidor))
        {
            if (Disponible)
            {
                throw new InvalidOperationException($"En la CI hace falta {Variable} para las pruebas de la API.");
            }

            return;
        }

        await EjecutarEnElServidor($"CREATE DATABASE \"{nombre}\"");
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        await base.DisposeAsync();

        if (string.IsNullOrWhiteSpace(servidor))
        {
            return;
        }

        NpgsqlConnection.ClearAllPools();
        await EjecutarEnElServidor($"DROP DATABASE IF EXISTS \"{nombre}\" WITH (FORCE)");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        // Como en Railway: fuera de Development la API exige HTTPS y manda HSTS.
        builder.UseEnvironment("Production");
        builder.UseSetting("ConnectionStrings:Treeve", CadenaDeConexion);
        builder.UseSetting("Cifrado:Llave", Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)));
        builder.UseSetting("Persistencia:AplicarMigraciones", "true");

        builder.ConfigureLogging(logging =>
        {
            logging.AddProvider(Logs);
            // Todo nivel y toda categoría, aunque appsettings.json filtre: la prueba busca el texto en cualquier rincón del log.
            logging.AddFilter<RegistroDeLogs>(null, LogLevel.Trace);
        });
    }

    /// <summary>
    /// Nombre de la API en las pruebas. No es "localhost" porque ASP.NET Core nunca manda HSTS a localhost,
    /// y la prueba de HTTPS lo comprueba.
    /// </summary>
    public const string Anfitrion = "api.treeve.test";

    /// <summary>Un cliente por HTTPS, como llega a la API detrás del proxy de Railway.</summary>
    public HttpClient Cliente(string? token = null) => Cliente(new Uri($"https://{Anfitrion}"), token);

    public HttpClient Cliente(Uri direccion, string? token = null)
    {
        var cliente = CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = direccion });
        if (token is not null)
        {
            cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        return cliente;
    }

    /// <summary>Todas las rutas registradas en la API, con sus métodos. Una ruta nueva entra sola en las pruebas.</summary>
    public IReadOnlyList<Ruta> Rutas()
    {
        _ = Server; // asegura que la API esté construida
        return [.. Services.GetRequiredService<EndpointDataSource>().Endpoints
            .OfType<RouteEndpoint>()
            .SelectMany(e => (e.Metadata.GetMetadata<HttpMethodMetadata>()?.HttpMethods ?? ["GET"]).Select(m => new Ruta(m, e)))
            .OrderBy(r => r.Patron, StringComparer.Ordinal)
            .ThenBy(r => r.Metodo, StringComparer.Ordinal)];
    }

    /// <summary>Registra una cuenta nueva por la API y devuelve su id y su token.</summary>
    public async Task<Cuenta> Registrar(string contrasena = "Clave-de-prueba-1")
    {
        var usuario = $"p{Guid.NewGuid():N}"[..20];
        using var cliente = Cliente();
        using var respuesta = await cliente.PostAsJsonAsync("/api/auth/registro", new
        {
            nombreCompleto = "Persona de Prueba",
            apodo = "Pru",
            nombreDeUsuario = usuario,
            contrasena,
        });
        respuesta.EnsureSuccessStatusCode();

        var sesion = (await respuesta.Content.ReadFromJsonAsync<SesionDePrueba>())!;
        return new Cuenta(sesion.UsuarioId, usuario, sesion.Token);
    }

    /// <summary>Los administradores se asignan con SQL (ADR-006); el staff también, para no depender de otra ruta.</summary>
    public Task AsignarRol(Guid usuarioId, string rol) =>
        Ejecutar("UPDATE treeve.usuarios SET rol = @rol WHERE id = @id", ("rol", rol), ("id", usuarioId));

    public async Task<long> Contar(string sql, params (string Nombre, object Valor)[] parametros)
    {
        await using var conexion = new NpgsqlConnection(CadenaDeConexion);
        await conexion.OpenAsync();
        await using var comando = Comando(conexion, sql, parametros);
        return Convert.ToInt64(await comando.ExecuteScalarAsync(), System.Globalization.CultureInfo.InvariantCulture);
    }

    /// <summary>Cada fila de cada tabla del esquema treeve, como texto. Sirve para buscar algo que nunca debería guardarse.</summary>
    public async Task<string> TodaLaBaseComoTexto()
    {
        await using var conexion = new NpgsqlConnection(CadenaDeConexion);
        await conexion.OpenAsync();

        var tablas = new List<string>();
        await using (var listar = new NpgsqlCommand(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'treeve' AND table_type = 'BASE TABLE'", conexion))
        await using (var lector = await listar.ExecuteReaderAsync())
        {
            while (await lector.ReadAsync())
            {
                tablas.Add(lector.GetString(0));
            }
        }

        var texto = new System.Text.StringBuilder();
        foreach (var tabla in tablas)
        {
            await using var leer = new NpgsqlCommand($"SELECT * FROM treeve.\"{tabla}\"", conexion);
            await using var lector = await leer.ExecuteReaderAsync();
            while (await lector.ReadAsync())
            {
                for (var columna = 0; columna < lector.FieldCount; columna++)
                {
                    // Las columnas binarias (bytea) se leen como UTF-8: un texto guardado sin cifrar se vería tal cual.
                    texto.Append(lector.GetValue(columna) switch
                    {
                        byte[] bytes => System.Text.Encoding.UTF8.GetString(bytes),
                        var valor => Convert.ToString(valor, System.Globalization.CultureInfo.InvariantCulture),
                    }).Append(' ');
                }

                texto.AppendLine();
            }
        }

        return texto.ToString();
    }

    private async Task Ejecutar(string sql, params (string Nombre, object Valor)[] parametros)
    {
        await using var conexion = new NpgsqlConnection(CadenaDeConexion);
        await conexion.OpenAsync();
        await using var comando = Comando(conexion, sql, parametros);
        await comando.ExecuteNonQueryAsync();
    }

    private static NpgsqlCommand Comando(NpgsqlConnection conexion, string sql, (string Nombre, object Valor)[] parametros)
    {
        var comando = new NpgsqlCommand(sql, conexion);
        foreach (var (nombreDelParametro, valor) in parametros)
        {
            comando.Parameters.AddWithValue(nombreDelParametro, valor);
        }

        return comando;
    }

    private async Task EjecutarEnElServidor(string sql)
    {
        await using var conexion = new NpgsqlConnection(new NpgsqlConnectionStringBuilder(servidor) { Database = "postgres" }.ConnectionString);
        await conexion.OpenAsync();
        await using var comando = new NpgsqlCommand(sql, conexion);
        await comando.ExecuteNonQueryAsync();
    }

    private sealed record SesionDePrueba(Guid UsuarioId, string Token);
}

public sealed record Cuenta(Guid Id, string Usuario, string Token);

/// <summary>Una ruta de la API con un método. <see cref="Ejemplo"/> reemplaza cada parámetro por un id cualquiera.</summary>
public sealed record Ruta(string Metodo, RouteEndpoint Endpoint)
{
    public string Patron => "/" + (Endpoint.RoutePattern.RawText ?? string.Empty).Trim('/');

    public string Ejemplo => System.Text.RegularExpressions.Regex.Replace(Patron, @"\{[^}]+\}", Guid.NewGuid().ToString());

    /// <summary>Pública: no exige sesión (sin <c>RequireAuthorization()</c>, o con <c>AllowAnonymous()</c>).</summary>
    public bool EsPublica =>
        Endpoint.Metadata.GetMetadata<Microsoft.AspNetCore.Authorization.IAllowAnonymous>() is not null ||
        Endpoint.Metadata.GetMetadata<Microsoft.AspNetCore.Authorization.IAuthorizeData>() is null;

    public HttpRequestMessage Peticion(string? token = null)
    {
        var peticion = new HttpRequestMessage(new HttpMethod(Metodo), Ejemplo);
        if (Metodo is "POST" or "PUT" or "PATCH")
        {
            // Un cuerpo vacío pero válido: la autorización tiene que decidir antes de leerlo.
            peticion.Content = JsonContent.Create(new { });
        }

        if (token is not null)
        {
            peticion.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        return peticion;
    }

    public override string ToString() => $"{Metodo} {Patron}";
}

/// <summary>Guarda cada línea del log (mensaje, excepción y valores estructurados) y cada scope abierto.</summary>
public sealed class RegistroDeLogs : ILoggerProvider
{
    private readonly ConcurrentQueue<string> lineas = new();

    public IReadOnlyCollection<string> Lineas => lineas;

    public ILogger CreateLogger(string categoryName) => new Registrador(this, categoryName);

    public void Dispose()
    {
    }

    private sealed class Registrador(RegistroDeLogs registro, string categoria) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state)
            where TState : notnull
        {
            registro.lineas.Enqueue($"{categoria} [scope] {Describir(state)}");
            return null;
        }

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            ArgumentNullException.ThrowIfNull(formatter);
            registro.lineas.Enqueue($"{categoria} [{logLevel}] {formatter(state, exception)} {Describir(state)} {exception}");
        }

        private static string Describir<TState>(TState state) =>
            state is IEnumerable<KeyValuePair<string, object?>> valores
                ? string.Join(" ", valores.Select(v => $"{v.Key}={v.Value}"))
                : state?.ToString() ?? string.Empty;
    }
}

/// <summary>Prueba que necesita PostgreSQL. Sin <see cref="ApiDePruebas.Variable"/> se salta en local; en la CI nunca.</summary>
public sealed class FactConPostgresAttribute : FactAttribute
{
    public FactConPostgresAttribute()
    {
        if (!ApiDePruebas.Disponible)
        {
            Skip = $"Necesita PostgreSQL: define {ApiDePruebas.Variable} (ver docs/guias/backend.md).";
        }
    }
}
