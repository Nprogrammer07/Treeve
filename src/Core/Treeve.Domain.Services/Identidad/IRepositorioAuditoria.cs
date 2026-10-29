using Treeve.Domain.Identidad;

namespace Treeve.Domain.Services.Identidad;

/// <summary>Un intento de acceso denegado con el nombre de usuario de quien lo hizo, para que un administrador lo lea (HU-12).</summary>
/// <param name="NombreDeUsuario">Null si la persona ya no existe.</param>
public sealed record AccesoDenegadoConNombre(
    Guid Id,
    Guid UsuarioId,
    string? NombreDeUsuario,
    DateTimeOffset OcurrioEn,
    string Ip,
    string Recurso,
    Rol RolRequerido)
{
    // La IP identifica a una persona: no se imprime.
    public override string ToString() => "[acceso denegado]";
}

/// <summary>
/// Auditoría de accesos (HU-10). A propósito solo se puede agregar y leer: el registro no se corrige ni se borra desde
/// el código de la aplicación, y la base de datos tampoco lo permite (ADR-006).
/// </summary>
public interface IRepositorioAuditoria
{
    Task Registrar(AccesoNoAutorizado acceso, CancellationToken ct);

    /// <summary>Del más reciente al más antiguo; a lo sumo <paramref name="limite"/> filas después de saltar <paramref name="desplazamiento"/>.</summary>
    Task<IReadOnlyList<AccesoDenegadoConNombre>> Listar(int limite, int desplazamiento, CancellationToken ct);
}
