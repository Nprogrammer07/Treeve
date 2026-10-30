using Treeve.Domain.Identidad;

namespace Treeve.Domain.Services.Identidad;

public interface IRepositorioCredenciales
{
    /// <summary>
    /// Credencial del usuario cuyo nombre de usuario o correo es el identificador (HU-03a). El identificador
    /// llega normalizado.
    /// </summary>
    Task<Credencial?> ObtenerPorIdentificador(string identificadorNormalizado, CancellationToken ct);

    /// <summary>Credencial de la persona (HU-03b: restablecer la contraseña).</summary>
    Task<Credencial?> ObtenerPorUsuarioId(Guid usuarioId, CancellationToken ct);

    /// <summary>Guarda los cambios de una credencial obtenida con este mismo repositorio.</summary>
    Task Actualizar(Credencial credencial, CancellationToken ct);
}
