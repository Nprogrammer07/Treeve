using Treeve.Domain.Sugerencias;

namespace Treeve.Domain.Services.Sugerencias;

/// <summary>
/// Filtros del listado de staff (HU-09, RNF de mantenibilidad). Todos son opcionales y se combinan.
/// <paramref name="Desde"/> se incluye y <paramref name="Hasta"/> no. <paramref name="NombreDeUsuario"/> ya viene normalizado.
/// </summary>
public sealed record FiltroDeSugerencias(
    EstadoSugerencia? Estado,
    DateTimeOffset? Desde,
    DateTimeOffset? Hasta,
    string? NombreDeUsuario,
    int Limite,
    int Desplazamiento);

/// <summary>Una sugerencia con el nombre de usuario de quien la envió, para el listado de staff.</summary>
public sealed record SugerenciaConAutor(
    Guid SugerenciaId,
    Guid UsuarioId,
    string NombreDeUsuario,
    string Texto,
    EstadoSugerencia Estado,
    DateTimeOffset CreadaEn)
{
    // El texto es libre y puede incluir datos personales: no se imprime.
    public override string ToString() => "[sugerencia]";
}
