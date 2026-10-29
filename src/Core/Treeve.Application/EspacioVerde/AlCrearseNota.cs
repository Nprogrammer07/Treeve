using Treeve.Application.Comun;
using Treeve.Domain.Desahogos;
using Treeve.Domain.EspacioVerde;
using Treeve.Domain.Services.EspacioVerde;

namespace Treeve.Application.EspacioVerde;

/// <summary>
/// HU-07a: cada desahogo riega el lote de su dueña. Escucha <see cref="NotaCreada"/> (TEC-03) y registra el riego; el
/// crecimiento se calcula a partir de los riegos. Es idempotente: el riego usa el id de la nota, así que un evento
/// repetido no cuenta dos veces.
/// </summary>
public sealed class AlCrearseNota(IRepositorioRiegos riegos) : IManejadorDeEventos<NotaCreada>
{
    public async Task Manejar(NotaCreada evento, CancellationToken ct) =>
        await riegos.RegistrarSiNoExiste(Riego.PorNota(evento), ct);
}
