using Treeve.Domain.Notificaciones;
using Treeve.Domain.Services.Notificaciones;

namespace Treeve.Application.Notificaciones;

public sealed record NotificacionVista(Guid NotificacionId, TipoDeNotificacion Tipo, string Mensaje, DateTimeOffset CreadaEn, bool Leida);

/// <summary>Los avisos de la persona con sesión, de los más recientes a los más antiguos. Nunca los de otra persona.</summary>
public sealed class ListarMisNotificaciones(IRepositorioNotificaciones notificaciones)
{
    /// <summary>Tope de la respuesta: los avisos son pocos, pero la lista no crece sin límite.</summary>
    public const int Maximo = 50;

    public async Task<IReadOnlyList<NotificacionVista>> Ejecutar(Guid usuarioId, CancellationToken ct)
    {
        var propias = await notificaciones.ListarDeUsuario(usuarioId, Maximo, ct);

        return [.. propias
            .Where(n => n.PerteneceA(usuarioId)) // defensa extra: el repositorio ya filtra por persona
            .Select(n => new NotificacionVista(n.Id, n.Tipo, n.Mensaje, n.CreadaEn, n.Leida))];
    }
}
