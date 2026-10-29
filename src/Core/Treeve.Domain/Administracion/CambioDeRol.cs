using Treeve.Domain.Comun;
using Treeve.Domain.Identidad;

namespace Treeve.Domain.Administracion;

/// <summary>
/// Registro de auditoría de un cambio de rol (HU-12, RNF de seguridad): qué administrador lo hizo, a quién, el rol
/// anterior, el nuevo y cuándo. Solo se agrega: no existe una operación para cambiarlo ni borrarlo, y la base de datos
/// lo impide con un trigger (ADR-006).
/// </summary>
public sealed class CambioDeRol
{
    private CambioDeRol(Guid id, Guid administradorId, Guid usuarioAfectadoId, Rol rolAnterior, Rol rolNuevo, DateTimeOffset ocurrioEn)
    {
        Id = id;
        AdministradorId = administradorId;
        UsuarioAfectadoId = usuarioAfectadoId;
        RolAnterior = rolAnterior;
        RolNuevo = rolNuevo;
        OcurrioEn = ocurrioEn;
    }

    public Guid Id { get; }
    public Guid AdministradorId { get; }
    public Guid UsuarioAfectadoId { get; }
    public Rol RolAnterior { get; }
    public Rol RolNuevo { get; }
    public DateTimeOffset OcurrioEn { get; }

    public static CambioDeRol Registrar(Guid administradorId, Guid usuarioAfectadoId, Rol rolAnterior, Rol rolNuevo, DateTimeOffset ahora)
    {
        if (administradorId == usuarioAfectadoId)
        {
            throw new ExcepcionDeDominio("Un administrador no puede cambiar su propio rol.");
        }

        if (!Enum.IsDefined(rolAnterior) || !Enum.IsDefined(rolNuevo) || rolAnterior == rolNuevo)
        {
            throw new ExcepcionDeDominio("El cambio de rol no es válido.");
        }

        return new CambioDeRol(Guid.NewGuid(), administradorId, usuarioAfectadoId, rolAnterior, rolNuevo, ahora);
    }

    /// <summary>Un cambio produce un solo evento, así que su id identifica el evento (idempotencia del bus).</summary>
    public RolCambiado Evento() => new(Id, UsuarioAfectadoId, RolAnterior, RolNuevo, OcurrioEn);

    public override string ToString() => "[cambio de rol]";
}
