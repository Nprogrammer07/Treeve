using Treeve.Domain.Sugerencias;

namespace Treeve.Domain.Services.Sugerencias;

public interface IRepositorioSugerencias
{
    Task Agregar(Sugerencia sugerencia, CancellationToken ct);

    /// <summary>Las sugerencias de una persona, de la más reciente a la más antigua, hasta <paramref name="limite"/>.</summary>
    Task<IReadOnlyList<Sugerencia>> ListarDeUsuario(Guid usuarioId, int limite, CancellationToken ct);

    /// <summary>
    /// Listado para staff, de la más reciente a la más antigua. Devuelve a lo sumo <see cref="FiltroDeSugerencias.Limite"/>
    /// filas, después de saltar <see cref="FiltroDeSugerencias.Desplazamiento"/>.
    /// </summary>
    Task<IReadOnlyList<SugerenciaConAutor>> Buscar(FiltroDeSugerencias filtro, CancellationToken ct);
}
