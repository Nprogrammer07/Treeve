using Treeve.Domain.Comun;

namespace Treeve.Application.Comun;

/// <summary>La hora actual llega desde afuera para que los casos de uso se puedan probar.</summary>
public interface IReloj
{
    DateTimeOffset Ahora { get; }
}

/// <summary>
/// Bus de eventos de dominio (TEC-03). La implementación en memoria vive en Infrastructure. Quien publica no se
/// entera de si un manejador falla: el guardado de una nota no puede depender del crecimiento del árbol.
/// </summary>
public interface IPublicadorEventos
{
    Task Publicar<TEvento>(TEvento evento, CancellationToken ct)
        where TEvento : IEventoDeDominio;
}

/// <summary>
/// Reacciona a un evento de dominio (p. ej. EspacioVerde ante <c>NotaCreada</c>). Debe ser idempotente: si recibe
/// el mismo evento dos veces, el efecto es el mismo que si lo recibe una (el bus ayuda, pero un reinicio lo
/// olvida; la garantía de fondo la da el manejador, por ejemplo con una clave única por <c>EventoId</c>).
/// Se registra en Treeve.Api/Composition como <c>IManejadorDeEventos&lt;TEvento&gt;</c>.
/// </summary>
public interface IManejadorDeEventos<in TEvento>
    where TEvento : IEventoDeDominio
{
    Task Manejar(TEvento evento, CancellationToken ct);
}

public sealed class AccesoDenegado() : Exception("No tienes permiso para esta acción.");
