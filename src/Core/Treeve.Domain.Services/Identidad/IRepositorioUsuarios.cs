using Treeve.Domain.Identidad;

namespace Treeve.Domain.Services.Identidad;

/// <summary>Lo único que se lee de una persona del staff (HU-12): sin nombre completo, correo ni motivo de registro.</summary>
public sealed record PersonaDelStaff(Guid UsuarioId, string NombreDeUsuario, string Apodo, Rol Rol);

public interface IRepositorioUsuarios
{
    /// <summary>Indica si ya existe un usuario con ese nombre de usuario o ese correo (ambos normalizados).</summary>
    Task<bool> ExisteNombreDeUsuarioOCorreo(string nombreDeUsuario, string? correo, CancellationToken ct);

    /// <summary>Guarda el perfil y su credencial juntos: un usuario sin credencial no podría entrar.</summary>
    Task Agregar(Usuario usuario, Credencial credencial, CancellationToken ct);

    Task<Usuario?> ObtenerPorId(Guid usuarioId, CancellationToken ct);

    /// <summary>Busca por nombre de usuario (ya normalizado). HU-12: el administrador asciende a alguien por su usuario.</summary>
    Task<Usuario?> ObtenerPorNombreDeUsuario(string nombreDeUsuario, CancellationToken ct);

    /// <summary>
    /// Las personas con rol de staff o administración, ordenadas por nombre de usuario (HU-12). Solo trae los campos de
    /// <see cref="PersonaDelStaff"/>: minimización de datos.
    /// </summary>
    Task<IReadOnlyList<PersonaDelStaff>> ListarStaff(CancellationToken ct);
}
