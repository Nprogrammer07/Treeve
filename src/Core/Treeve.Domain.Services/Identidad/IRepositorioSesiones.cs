using Treeve.Domain.Identidad;

namespace Treeve.Domain.Services.Identidad;

public interface IRepositorioSesiones
{
    Task Agregar(Sesion sesion, CancellationToken ct);

    /// <summary>Devuelve la sesión con ese hash de token si todavía no venció.</summary>
    Task<Sesion?> ObtenerVigentePorTokenHash(string tokenHash, DateTimeOffset ahora, CancellationToken ct);
}
