using Treeve.Application.Comun;
using Treeve.Domain.Notificaciones;
using Treeve.Domain.Services.Notificaciones;
using Treeve.Domain.Sugerencias;

namespace Treeve.Application.Notificaciones;

/// <summary>
/// HU-11: cuando el staff cambia el estado de una sugerencia o la comenta, quien la envió recibe un aviso dentro de la
/// aplicación. Es idempotente, como <see cref="AlCambiarRol"/>: la notificación guarda el id del evento, que es único.
/// </summary>
public sealed class AlGestionarSugerencia(IRepositorioNotificaciones notificaciones) : IManejadorDeEventos<SugerenciaGestionada>
{
    public async Task Manejar(SugerenciaGestionada evento, CancellationToken ct) =>
        await notificaciones.AgregarSiNoExiste(Notificacion.PorSugerenciaGestionada(evento), ct);
}
