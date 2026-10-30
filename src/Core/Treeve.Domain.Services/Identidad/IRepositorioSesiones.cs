using Treeve.Domain.Identidad;

namespace Treeve.Domain.Services.Identidad;

public interface IRepositorioSesiones
{
    Task Agregar(Sesion sesion, CancellationToken ct);

    /// <summary>HU-03b: cierra todas las sesiones de la persona (tras cambiar su contraseña).</summary>
    Task RevocarDeUsuario(Guid usuarioId, CancellationToken ct);

    /// <summary>Devuelve la sesión con ese hash de token si todavía no venció.</summary>
    Task<Sesion?> ObtenerVigentePorTokenHash(string tokenHash, DateTimeOffset ahora, CancellationToken ct);
}
