using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Treeve.Infrastructure.Persistence;

public static class AplicadorDeMigraciones
{
    /// <summary>Aplica las migraciones pendientes. Se invoca al arrancar si Persistencia:AplicarMigraciones es true.</summary>
    public static async Task AplicarMigraciones(this IServiceProvider servicios, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(servicios);

        await using var alcance = servicios.CreateAsyncScope();
        var contexto = alcance.ServiceProvider.GetRequiredService<TreeveDbContext>();
        await contexto.Database.MigrateAsync(ct);
    }
}
