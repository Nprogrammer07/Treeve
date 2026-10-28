using Treeve.Application.Comun;
using Treeve.Domain.Administracion;
using Treeve.Domain.Identidad;
using Treeve.Domain.Services.Administracion;

namespace Treeve.Application.Administracion;

/// <summary>Resultado de ascender o revocar: a quién y de qué rol a qué rol.</summary>
public sealed record CambioDeRolAplicado(
    Guid UsuarioId,
    string NombreDeUsuario,
    string Apodo,
    Rol RolAnterior,
    Rol RolNuevo,
    DateTimeOffset OcurrioEn);

/// <summary>
/// Paso común de ascender y revocar (HU-12): guarda el nuevo rol junto con su registro de auditoría, en una sola
/// transacción, y después publica <see cref="RolCambiado"/> para que se notifique a la persona. Si la notificación falla,
/// el cambio y su registro ya quedaron: el bus no deja que un manejador deshaga lo hecho (TEC-03).
/// </summary>
public sealed class RegistradorDeCambiosDeRol(IRepositorioCambiosDeRol cambios, IPublicadorEventos eventos, IReloj reloj)
{
    public async Task<CambioDeRolAplicado> Registrar(Guid administradorId, Usuario usuario, Rol rolAnterior, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(usuario);

        var cambio = CambioDeRol.Registrar(administradorId, usuario.Id, rolAnterior, usuario.Rol, reloj.Ahora);

        await cambios.Registrar(cambio, usuario, ct);
        await eventos.Publicar(cambio.Evento(), ct);

        return new CambioDeRolAplicado(usuario.Id, usuario.NombreDeUsuario, usuario.Apodo, cambio.RolAnterior, cambio.RolNuevo, cambio.OcurrioEn);
    }
}
