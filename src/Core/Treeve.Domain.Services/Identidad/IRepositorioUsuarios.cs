using Treeve.Domain.Identidad;

namespace Treeve.Domain.Services.Identidad;

public interface IRepositorioUsuarios
{
    /// <summary>Indica si ya existe un usuario con ese nombre de usuario o ese correo (ambos normalizados).</summary>
    Task<bool> ExisteNombreDeUsuarioOCorreo(string nombreDeUsuario, string? correo, CancellationToken ct);

    /// <summary>Guarda el perfil y su credencial juntos: un usuario sin credencial no podría entrar.</summary>
    Task Agregar(Usuario usuario, Credencial credencial, CancellationToken ct);

    Task<Usuario?> ObtenerPorId(Guid usuarioId, CancellationToken ct);
}
