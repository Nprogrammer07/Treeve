using Microsoft.EntityFrameworkCore;
using Npgsql;
using Treeve.Domain.Notificaciones;
using Treeve.Domain.Services.Notificaciones;

namespace Treeve.Infrastructure.Persistence.Notificaciones;

internal sealed class RepositorioNotificacionesPostgres(TreeveDbContext contexto) : IRepositorioNotificaciones
{
    public async Task<bool> AgregarSiNoExiste(Notificacion notificacion, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(notificacion);

        if (await contexto.Set<Notificacion>().AnyAsync(n => n.EventoId == notificacion.EventoId, ct))
        {
            return false;
        }

        contexto.Set<Notificacion>().Add(notificacion);

        try
        {
            await contexto.SaveChangesAsync(ct);
            return true;
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            // Dos entregas simultáneas del mismo evento: la segunda la frena el índice único.
            contexto.Entry(notificacion).State = EntityState.Detached;
            return false;
        }
    }

    public async Task<IReadOnlyList<Notificacion>> ListarDeUsuario(Guid usuarioId, int limite, CancellationToken ct) =>
        await contexto.Set<Notificacion>().AsNoTracking()
            .Where(n => n.UsuarioId == usuarioId)
            .OrderByDescending(n => n.CreadaEn)
            .ThenByDescending(n => n.Id)
            .Take(limite)
            .ToListAsync(ct);

    public Task<Notificacion?> ObtenerPorId(Guid notificacionId, CancellationToken ct) =>
        contexto.Set<Notificacion>().FirstOrDefaultAsync(n => n.Id == notificacionId, ct);

    public async Task GuardarLectura(Notificacion notificacion, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(notificacion);

        if (contexto.Entry(notificacion).State == EntityState.Detached)
        {
            contexto.Attach(notificacion);
        }

        contexto.Entry(notificacion).Property(n => n.LeidaEn).IsModified = true;
        await contexto.SaveChangesAsync(ct);
    }
}
