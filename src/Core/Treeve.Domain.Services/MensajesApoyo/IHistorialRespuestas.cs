using Treeve.Domain.MensajesApoyo;

namespace Treeve.Domain.Services.MensajesApoyo;

/// <summary>Últimas respuestas de cada persona, para no repetir fragmentos (ADR-001).</summary>
public interface IHistorialRespuestas
{
    /// <summary>Las <paramref name="cantidad"/> respuestas más recientes de la persona, de la más nueva a la más vieja.</summary>
    Task<IReadOnlyList<RespuestaRegistrada>> ObtenerRecientes(Guid usuarioId, int cantidad, CancellationToken ct);

    /// <summary>
    /// Guarda la respuesta y borra las más viejas, dejando solo <paramref name="conservar"/>: lo que no sirve
    /// para evitar repeticiones no se guarda.
    /// </summary>
    Task Registrar(RespuestaRegistrada respuesta, int conservar, CancellationToken ct);
}
