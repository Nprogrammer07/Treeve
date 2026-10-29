using Treeve.Domain.EspacioVerde;
using Treeve.Domain.Services.EspacioVerde;

namespace Treeve.Application.EspacioVerde;

/// <summary>
/// HU-07a: el estado del lote de la persona con sesión ("espacio verde accesible en cualquier momento"). Solo el propio:
/// la persona sale de la sesión, nunca de la petición.
/// </summary>
public sealed class ConsultarEspacioVerde(IRepositorioRiegos riegos, ReglaDeCrecimiento regla)
{
    public async Task<EstadoDelLote> Ejecutar(Guid usuarioId, CancellationToken ct) =>
        regla.Calcular(await riegos.ContarDeUsuario(usuarioId, ct));
}
