using Microsoft.EntityFrameworkCore;
using Treeve.Domain.Identidad;
using Treeve.Domain.Services.Identidad;

namespace Treeve.Infrastructure.Persistence.Identidad;

internal sealed class RepositorioSesionesPostgres(TreeveDbContext contexto) : IRepositorioSesiones
{
    public async Task Agregar(Sesion sesion, CancellationToken ct)
    {
        contexto.Set<Sesion>().Add(sesion);
        await contexto.SaveChangesAsync(ct);
    }

    public Task<Sesion?> ObtenerVigentePorTokenHash(string tokenHash, DateTimeOffset ahora, CancellationToken ct) =>
        contexto.Set<Sesion>().FirstOrDefaultAsync(s => s.TokenHash == tokenHash && s.ExpiraEn > ahora, ct);
}
