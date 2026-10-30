using Microsoft.EntityFrameworkCore;
using Treeve.Domain.Identidad;
using Treeve.Domain.Services.Identidad;

namespace Treeve.Infrastructure.Persistence.Identidad;

internal sealed class RepositorioRecuperacionesPostgres(TreeveDbContext contexto) : IRepositorioRecuperaciones
{
    public async Task Agregar(RecuperacionDeContrasena recuperacion, CancellationToken ct)
    {
        contexto.Set<RecuperacionDeContrasena>().Add(recuperacion);
        await contexto.SaveChangesAsync(ct);
    }

    public Task<bool> HayEmitidaDesde(Guid usuarioId, DateTimeOffset desde, CancellationToken ct) =>
        contexto.Set<RecuperacionDeContrasena>().AnyAsync(r => r.UsuarioId == usuarioId && r.CreadaEn > desde, ct);

    public Task InvalidarPendientes(Guid usuarioId, DateTimeOffset ahora, CancellationToken ct) =>
        contexto.Set<RecuperacionDeContrasena>()
            .Where(r => r.UsuarioId == usuarioId && r.UsadaEn == null)
            .ExecuteUpdateAsync(s => s.SetProperty(r => r.UsadaEn, (DateTimeOffset?)ahora), ct);

    public async Task<Guid?> Consumir(string tokenHash, DateTimeOffset ahora, CancellationToken ct)
    {
        var recuperacion = await contexto.Set<RecuperacionDeContrasena>()
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.TokenHash == tokenHash && r.UsadaEn == null && r.ExpiraEn > ahora, ct);

        if (recuperacion is null)
        {
            return null;
        }

        // El UPDATE condicional es el que decide: si otra petición gastó el token entre la lectura y aquí,
        // no actualiza ninguna fila y esta petición pierde.
        var filas = await contexto.Set<RecuperacionDeContrasena>()
            .Where(r => r.Id == recuperacion.Id && r.UsadaEn == null)
            .ExecuteUpdateAsync(s => s.SetProperty(r => r.UsadaEn, (DateTimeOffset?)ahora), ct);

        return filas == 1 ? recuperacion.UsuarioId : null;
    }
}
