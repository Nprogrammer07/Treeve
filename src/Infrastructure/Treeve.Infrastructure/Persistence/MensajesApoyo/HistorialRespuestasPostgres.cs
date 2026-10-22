using Microsoft.EntityFrameworkCore;
using Treeve.Domain.MensajesApoyo;
using Treeve.Domain.Services.MensajesApoyo;

namespace Treeve.Infrastructure.Persistence.MensajesApoyo;

internal sealed class HistorialRespuestasPostgres(TreeveDbContext contexto) : IHistorialRespuestas
{
    public async Task<IReadOnlyList<RespuestaRegistrada>> ObtenerRecientes(Guid usuarioId, int cantidad, CancellationToken ct) =>
        await DeLaPersona(usuarioId).AsNoTracking().Take(cantidad).ToListAsync(ct);

    public async Task Registrar(RespuestaRegistrada respuesta, int conservar, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(respuesta);

        contexto.Set<RespuestaRegistrada>().Add(respuesta);
        await contexto.SaveChangesAsync(ct);

        // Minimización de datos: solo quedan las respuestas que sirven para no repetir fragmentos.
        var aConservar = DeLaPersona(respuesta.UsuarioId).Take(conservar).Select(r => r.Id);
        await contexto.Set<RespuestaRegistrada>()
            .Where(r => r.UsuarioId == respuesta.UsuarioId && !aConservar.Contains(r.Id))
            .ExecuteDeleteAsync(ct);
    }

    /// <summary>De la más nueva a la más vieja.</summary>
    private IQueryable<RespuestaRegistrada> DeLaPersona(Guid usuarioId) =>
        contexto.Set<RespuestaRegistrada>()
            .Where(r => r.UsuarioId == usuarioId)
            .OrderByDescending(r => r.CreadaEn)
            .ThenByDescending(r => r.Id);
}
