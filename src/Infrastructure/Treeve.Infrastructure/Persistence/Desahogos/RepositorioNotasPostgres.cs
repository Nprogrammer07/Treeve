using Microsoft.EntityFrameworkCore;
using Treeve.Domain.Desahogos;
using Treeve.Domain.Services.Desahogos;

namespace Treeve.Infrastructure.Persistence.Desahogos;

internal sealed class RepositorioNotasPostgres(TreeveDbContext contexto) : IRepositorioNotas
{
    public async Task Agregar(Nota nota, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(nota);

        contexto.Set<Nota>().Add(nota);
        await contexto.SaveChangesAsync(ct);
    }

    public Task<Nota?> ObtenerPorId(Guid notaId, CancellationToken ct) =>
        contexto.Set<Nota>().AsNoTracking().FirstOrDefaultAsync(n => n.Id == notaId, ct);
}
