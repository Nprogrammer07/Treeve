using Microsoft.EntityFrameworkCore;
using Npgsql;
using Treeve.Domain.EspacioVerde;
using Treeve.Domain.Services.EspacioVerde;

namespace Treeve.Infrastructure.Persistence.EspacioVerde;

internal sealed class RepositorioRiegosPostgres(TreeveDbContext contexto) : IRepositorioRiegos
{
    public async Task<bool> RegistrarSiNoExiste(Riego riego, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(riego);

        if (await contexto.Set<Riego>().AnyAsync(r => r.Id == riego.Id, ct))
        {
            return false;
        }

        contexto.Set<Riego>().Add(riego);

        try
        {
            await contexto.SaveChangesAsync(ct);
            return true;
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            // Dos entregas simultáneas del mismo evento: la segunda la frena la llave primaria.
            contexto.Entry(riego).State = EntityState.Detached;
            return false;
        }
    }

    public Task<int> ContarDeUsuario(Guid usuarioId, CancellationToken ct) =>
        contexto.Set<Riego>().CountAsync(r => r.UsuarioId == usuarioId, ct);
}
