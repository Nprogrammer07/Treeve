using Treeve.Domain.Identidad;

namespace Treeve.Domain.Services.Identidad;

public interface IRepositorioUsuarios
{
    /// <summary>Indica si ya existe un usuario con ese nombre de usuario o ese correo (ambos normalizados).</summary>
    Task<bool> ExisteNombreDeUsuarioOCorreo(string nombreDeUsuario, string? correo, CancellationToken ct);

    Task Agregar(Usuario usuario, CancellationToken ct);
}
