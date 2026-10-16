using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Treeve.Application.Comun;
using Treeve.Infrastructure.Persistence;

namespace Treeve.Infrastructure;

/// <summary>
/// Registra las implementaciones de infraestructura de las interfaces del núcleo:
/// repositorios (Persistence/), cifrado de desahogos, bus de eventos en memoria, reloj.
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        var cadenaDeConexion = configuration.GetConnectionString("Treeve")
            ?? throw new InvalidOperationException(
                "Falta la cadena de conexión ConnectionStrings:Treeve (variable de entorno ConnectionStrings__Treeve).");

        services.AddDbContext<TreeveDbContext>(opciones => opciones.UseNpgsql(
            cadenaDeConexion,
            npgsql => npgsql.MigrationsHistoryTable("__EFMigrationsHistory", TreeveDbContext.Esquema)));

        services.AddScoped<IVerificadorDeBaseDeDatos, VerificadorDeBaseDeDatosPostgres>();

        // Ejemplo: services.AddScoped<IRepositorioNotas, RepositorioNotasPostgres>();
        return services;
    }
}
