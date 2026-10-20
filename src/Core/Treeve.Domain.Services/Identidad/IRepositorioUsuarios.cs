using Treeve.Domain.Identidad;

namespace Treeve.Domain.Services.Identidad;

public interface IRepositorioUsuarios
{
    /// <summary>Indica si ya existe un usuario con ese nombre de usuario o ese correo (ambos normalizados).</summary>
    Task<bool> ExisteNombreDeUsuarioOCorreo(string nombreDeUsuario, string? correo, CancellationToken ct);

    Task Agregar(Usuario usuario, CancellationToken ct);

    /// <summary>Busca por nombre de usuario o por correo (HU-03a). El identificador llega normalizado.</summary>
    Task<Usuario?> ObtenerPorIdentificador(string identificadorNormalizado, CancellationToken ct);

    /// <summary>Guarda los cambios de un usuario obtenido con este mismo repositorio.</summary>
    Task Actualizar(Usuario usuario, CancellationToken ct);
}
