using Treeve.Domain.Identidad;
using Treeve.Domain.Services.Identidad;

namespace Treeve.Infrastructure.Persistence.Identidad;

internal sealed class RepositorioAuditoriaPostgres(TreeveDbContext contexto) : IRepositorioAuditoria
{
    public async Task Registrar(AccesoNoAutorizado acceso, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(acceso);

        contexto.Set<AccesoNoAutorizado>().Add(acceso);
        await contexto.SaveChangesAsync(ct);
    }
}
