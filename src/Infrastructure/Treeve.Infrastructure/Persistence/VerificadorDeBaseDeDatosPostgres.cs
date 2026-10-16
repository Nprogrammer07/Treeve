using Microsoft.EntityFrameworkCore;
using Treeve.Application.Comun;

namespace Treeve.Infrastructure.Persistence;

internal sealed class VerificadorDeBaseDeDatosPostgres(TreeveDbContext contexto) : IVerificadorDeBaseDeDatos
{
    private static readonly TimeSpan Limite = TimeSpan.FromSeconds(3);

    public async Task<bool> EstaDisponible(CancellationToken ct)
    {
        using var conLimite = CancellationTokenSource.CreateLinkedTokenSource(ct);
        conLimite.CancelAfter(Limite);

        try
        {
            return await contexto.Database.CanConnectAsync(conLimite.Token);
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            return false; // se agotó el límite, no cancelaron la petición
        }
    }
}
