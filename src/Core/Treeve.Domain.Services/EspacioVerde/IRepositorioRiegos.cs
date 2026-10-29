using Treeve.Domain.EspacioVerde;

namespace Treeve.Domain.Services.EspacioVerde;

public interface IRepositorioRiegos
{
    /// <summary>
    /// Guarda el riego si esa nota todavía no regó el lote. Devuelve false si ya estaba: así un evento repetido no
    /// hace crecer el lote dos veces (consumidor idempotente, TEC-03).
    /// </summary>
    Task<bool> RegistrarSiNoExiste(Riego riego, CancellationToken ct);

    Task<int> ContarDeUsuario(Guid usuarioId, CancellationToken ct);
}
