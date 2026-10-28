using Treeve.Application.Comun;
using Treeve.Domain.Services.Notificaciones;

namespace Treeve.Application.Notificaciones;

/// <summary>La persona marca uno de sus avisos como leído. Solo la dueña puede hacerlo.</summary>
public sealed class MarcarNotificacionLeida(IRepositorioNotificaciones notificaciones, IReloj reloj)
{
    public async Task Ejecutar(Guid usuarioId, Guid notificacionId, CancellationToken ct)
    {
        var notificacion = await notificaciones.ObtenerPorId(notificacionId, ct);

        // Mismo error si no existe o si es de otra persona, para no revelar que existe.
        if (notificacion is null || !notificacion.PerteneceA(usuarioId))
        {
            throw new AccesoDenegado();
        }

        if (notificacion.Leida)
        {
            return;
        }

        notificacion.MarcarLeida(reloj.Ahora);
        await notificaciones.GuardarLectura(notificacion, ct);
    }
}
