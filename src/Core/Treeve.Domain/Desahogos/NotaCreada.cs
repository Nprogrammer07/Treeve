using Treeve.Domain.Comun;

namespace Treeve.Domain.Desahogos;

/// <summary>
/// Se publica cuando un desahogo queda guardado (HU-05). Solo ids y metadatos, nunca el texto. Lo escucha, entre
/// otros, el área EspacioVerde para hacer crecer el árbol (HU-07a).
/// </summary>
/// <param name="EventoId">Una nota produce un solo <see cref="NotaCreada"/>, así que usa el id de la nota.</param>
public sealed record NotaCreada(Guid EventoId, Guid NotaId, Guid UsuarioId, Emocion Emocion, DateTimeOffset Fecha)
    : IEventoDeDominio;
