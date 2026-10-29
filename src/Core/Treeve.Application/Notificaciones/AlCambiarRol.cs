using Treeve.Application.Comun;
using Treeve.Domain.Administracion;
using Treeve.Domain.Notificaciones;
using Treeve.Domain.Services.Notificaciones;

namespace Treeve.Application.Notificaciones;

/// <summary>
/// HU-12: "notificar al usuario el cambio". Escucha <see cref="RolCambiado"/> y deja un aviso dentro de la aplicación.
/// Es idempotente: la notificación guarda el id del evento, que es único, así que un evento repetido no avisa dos veces.
/// </summary>
public sealed class AlCambiarRol(IRepositorioNotificaciones notificaciones) : IManejadorDeEventos<RolCambiado>
{
    public async Task Manejar(RolCambiado evento, CancellationToken ct) =>
        await notificaciones.AgregarSiNoExiste(Notificacion.PorCambioDeRol(evento), ct);
}
