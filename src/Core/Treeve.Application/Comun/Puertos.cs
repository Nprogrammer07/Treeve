namespace Treeve.Application.Comun;

/// <summary>La hora actual llega desde afuera para que los casos de uso se puedan probar.</summary>
public interface IReloj
{
    DateTimeOffset Ahora { get; }
}

/// <summary>Bus de eventos de dominio (TEC-03). La implementación en memoria vive en Infrastructure.</summary>
public interface IPublicadorEventos
{
    Task Publicar<TEvento>(TEvento evento, CancellationToken ct)
        where TEvento : notnull;
}

public sealed class AccesoDenegado() : Exception("No tienes permiso para esta acción.");
