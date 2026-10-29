using Treeve.Domain.Notificaciones;

namespace Treeve.Domain.Services.Notificaciones;

public interface IRepositorioNotificaciones
{
    /// <summary>
    /// Guarda la notificación si no hay otra del mismo evento. Devuelve false si ya existía: así un evento repetido no
    /// avisa dos veces (consumidor idempotente, TEC-03).
    /// </summary>
    Task<bool> AgregarSiNoExiste(Notificacion notificacion, CancellationToken ct);

    /// <summary>Las de una persona, de la más reciente a la más antigua, hasta <paramref name="limite"/>.</summary>
    Task<IReadOnlyList<Notificacion>> ListarDeUsuario(Guid usuarioId, int limite, CancellationToken ct);

    Task<Notificacion?> ObtenerPorId(Guid notificacionId, CancellationToken ct);

    Task GuardarLectura(Notificacion notificacion, CancellationToken ct);
}
