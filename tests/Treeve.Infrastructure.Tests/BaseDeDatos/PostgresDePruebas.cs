using Microsoft.EntityFrameworkCore;
using Npgsql;
using Treeve.Infrastructure.Persistence;

namespace Treeve.Infrastructure.Tests.BaseDeDatos;

/// <summary>
/// Una base PostgreSQL de usar y tirar para las pruebas que necesitan la base real (triggers, concurrencia, consultas).
/// Se crea con un nombre único, recibe las migraciones de verdad y se borra al terminar. El servidor sale de la variable
/// <see cref="Variable"/> (sin base de datos: "Host=localhost;Port=5432;Username=postgres;Password=postgres").
/// Nunca apunta a Supabase: solo a un servidor de pruebas.
/// </summary>
public sealed class PostgresDePruebas : IAsyncLifetime
{
    public const string Variable = "TREEVE_PRUEBAS_POSTGRES";

    private readonly string? servidor = Environment.GetEnvironmentVariable(Variable);
    private readonly string nombre = $"treeve_pruebas_{Guid.NewGuid():N}";

    /// <summary>En la CI (GitHub pone CI=true) estas pruebas nunca se saltan: si falta el servidor, fallan.</summary>
    public static bool Disponible =>
        !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(Variable)) || EnCi;

    internal static bool EnCi => string.Equals(Environment.GetEnvironmentVariable("CI"), "true", StringComparison.OrdinalIgnoreCase);

    public async Task InitializeAsync()
    {
        if (string.IsNullOrWhiteSpace(servidor))
        {
            if (EnCi)
            {
                throw new InvalidOperationException($"En la CI hace falta {Variable} para las pruebas con PostgreSQL.");
            }

            return;
        }

        await Ejecutar($"CREATE DATABASE \"{nombre}\"");
        await using var contexto = NuevoContexto();
        await contexto.Database.MigrateAsync();
    }

    public async Task DisposeAsync()
    {
        if (string.IsNullOrWhiteSpace(servidor))
        {
            return;
        }

        NpgsqlConnection.ClearAllPools();
        await Ejecutar($"DROP DATABASE IF EXISTS \"{nombre}\" WITH (FORCE)");
    }

    /// <summary>Un contexto nuevo, configurado igual que en <c>DependencyInjection</c>. Cada uno es una "petición" distinta.</summary>
    public TreeveDbContext NuevoContexto() =>
        new(new DbContextOptionsBuilder<TreeveDbContext>()
            .UseNpgsql(
                new NpgsqlConnectionStringBuilder(servidor) { Database = nombre }.ConnectionString,
                npgsql => npgsql.MigrationsHistoryTable("__EFMigrationsHistory", TreeveDbContext.Esquema))
            .Options);

    private async Task Ejecutar(string sql)
    {
        await using var conexion = new NpgsqlConnection(new NpgsqlConnectionStringBuilder(servidor) { Database = "postgres" }.ConnectionString);
        await conexion.OpenAsync();
        await using var comando = new NpgsqlCommand(sql, conexion);
        await comando.ExecuteNonQueryAsync();
    }
}

/// <summary>Prueba que necesita PostgreSQL. Sin <see cref="PostgresDePruebas.Variable"/> se salta en local; en la CI nunca.</summary>
public sealed class FactConPostgresAttribute : FactAttribute
{
    public FactConPostgresAttribute()
    {
        if (!PostgresDePruebas.Disponible)
        {
            Skip = $"Necesita PostgreSQL: define {PostgresDePruebas.Variable} (ver docs/guias/backend.md).";
        }
    }
}

/// <summary>Como <see cref="FactConPostgresAttribute"/>, para pruebas con varios casos.</summary>
public sealed class TheoryConPostgresAttribute : TheoryAttribute
{
    public TheoryConPostgresAttribute()
    {
        if (!PostgresDePruebas.Disponible)
        {
            Skip = $"Necesita PostgreSQL: define {PostgresDePruebas.Variable} (ver docs/guias/backend.md).";
        }
    }
}
