namespace Treeve.Domain.Comun;

/// <summary>
/// Un hecho que ya ocurrió en el dominio (TEC-03). Lleva solo ids y metadatos: nunca el texto de un desahogo
/// ni nada que lo delate (CLAUDE.md, eventos de dominio). Una prueba de Treeve.Domain.Tests lo vigila.
/// </summary>
public interface IEventoDeDominio
{
    /// <summary>
    /// Identifica el evento: dos entregas con el mismo id son el mismo evento y el bus no se lo da dos veces al
    /// mismo manejador (idempotencia).
    /// </summary>
    Guid EventoId { get; }

    DateTimeOffset Fecha { get; }
}
