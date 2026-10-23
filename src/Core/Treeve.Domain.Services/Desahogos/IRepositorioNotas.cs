using Treeve.Domain.Desahogos;

namespace Treeve.Domain.Services.Desahogos;

public interface IRepositorioNotas
{
    Task Agregar(Nota nota, CancellationToken ct);

    Task<Nota?> ObtenerPorId(Guid notaId, CancellationToken ct);
}
