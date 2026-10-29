using Treeve.Domain.Administracion;
using Treeve.Domain.Identidad;

namespace Treeve.Domain.Services.Administracion;

/// <summary>Un cambio de rol con los nombres de usuario de quien lo hizo y de quien lo recibió (null si ya no existen).</summary>
public sealed record CambioDeRolConNombres(
    Guid Id,
    Guid AdministradorId,
    string? NombreDelAdministrador,
    Guid UsuarioAfectadoId,
    string? NombreDelUsuarioAfectado,
    Rol RolAnterior,
    Rol RolNuevo,
    DateTimeOffset OcurrioEn);

/// <summary>Log de cambios de rol (HU-12). Solo se agrega y se lee: ni el código ni la base de datos permiten cambiarlo (ADR-006).</summary>
public interface IRepositorioCambiosDeRol
{
    /// <summary>
    /// Guarda el nuevo rol de <paramref name="usuarioAfectado"/> y el <paramref name="cambio"/> en una sola transacción:
    /// o quedan los dos o ninguno. Así nunca hay un cambio de rol sin su registro de auditoría.
    /// </summary>
    Task Registrar(CambioDeRol cambio, Usuario usuarioAfectado, CancellationToken ct);

    /// <summary>Del más reciente al más antiguo; a lo sumo <paramref name="limite"/> filas después de saltar <paramref name="desplazamiento"/>.</summary>
    Task<IReadOnlyList<CambioDeRolConNombres>> Listar(int limite, int desplazamiento, CancellationToken ct);
}
