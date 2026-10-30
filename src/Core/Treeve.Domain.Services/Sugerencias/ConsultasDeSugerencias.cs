using Treeve.Domain.Sugerencias;

namespace Treeve.Domain.Services.Sugerencias;

/// <summary>HU-11 (RNF: filtrar y ordenar 1000+ registros). Ante un empate, la más reciente va primero.</summary>
public enum OrdenDeSugerencias
{
    /// <summary>De la más reciente a la más antigua (por defecto).</summary>
    Recientes,

    /// <summary>De la más antigua a la más reciente: sirve para atender primero lo que lleva más tiempo esperando.</summary>
    Antiguas,

    /// <summary>Por nombre de usuario, de la A a la Z.</summary>
    Usuario,
}

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
    int Desplazamiento,
    OrdenDeSugerencias Orden = OrdenDeSugerencias.Recientes);

/// <summary>
/// Una sugerencia con el nombre de usuario de quien la envió, para el listado de staff. Incluye la respuesta del staff
/// (HU-11) y cuándo se gestionó por última vez.
/// </summary>
public sealed record SugerenciaConAutor(
    Guid SugerenciaId,
    Guid UsuarioId,
    string NombreDeUsuario,
    string Texto,
    EstadoSugerencia Estado,
    DateTimeOffset CreadaEn,
    string? Comentario = null,
    DateTimeOffset? GestionadaEn = null)
{
    // El texto es libre y puede incluir datos personales: no se imprime.
    public override string ToString() => "[sugerencia]";
}
