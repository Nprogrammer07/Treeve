using Treeve.Domain.Comun;

namespace Treeve.Domain.Sugerencias;

/// <summary>
/// Se publica cuando el staff cambia el estado de una sugerencia o su comentario (HU-11). Solo ids y metadatos: nunca
/// el texto de la sugerencia ni el del comentario. Lo escucha el área Notificaciones para avisarle a quien sugirió.
/// </summary>
/// <param name="UsuarioId">Quien envió la sugerencia (el que recibe el aviso), no quien la gestionó.</param>
public sealed record SugerenciaGestionada(
    Guid EventoId,
    Guid SugerenciaId,
    Guid UsuarioId,
    EstadoSugerencia Estado,
    bool CambioElEstado,
    bool CambioElComentario,
    DateTimeOffset Fecha) : IEventoDeDominio;
