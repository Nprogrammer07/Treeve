using Treeve.Domain.Sugerencias;

namespace Treeve.Domain.Services.Sugerencias;

public interface IRepositorioSugerencias
{
    Task Agregar(Sugerencia sugerencia, CancellationToken ct);

    /// <summary>HU-11: la sugerencia a gestionar, lista para <see cref="Guardar"/>. Null si no existe.</summary>
    Task<Sugerencia?> ObtenerPorId(Guid sugerenciaId, CancellationToken ct);

    /// <summary>Guarda los cambios de una sugerencia obtenida con <see cref="ObtenerPorId"/>.</summary>
    Task Guardar(Sugerencia sugerencia, CancellationToken ct);

    /// <summary>Las sugerencias de una persona, de la más reciente a la más antigua, hasta <paramref name="limite"/>.</summary>
    Task<IReadOnlyList<Sugerencia>> ListarDeUsuario(Guid usuarioId, int limite, CancellationToken ct);

    /// <summary>
    /// Listado para staff, en el orden de <see cref="FiltroDeSugerencias.Orden"/>. Devuelve a lo sumo <see cref="FiltroDeSugerencias.Limite"/>
    /// filas, después de saltar <see cref="FiltroDeSugerencias.Desplazamiento"/>.
    /// </summary>
    Task<IReadOnlyList<SugerenciaConAutor>> Buscar(FiltroDeSugerencias filtro, CancellationToken ct);
}
