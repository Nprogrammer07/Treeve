using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

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

        // Ejemplo: services.AddScoped<IRepositorioNotas, RepositorioNotasPostgres>();
        return services;
    }
}
