using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Treeve.Application.Comun;
using Treeve.Domain.Comun;

namespace Treeve.Infrastructure.Eventos;

/// <summary>
/// Bus de eventos de dominio dentro del proceso (TEC-03, ADR-004). Entrega cada evento a los manejadores
/// registrados como <see cref="IManejadorDeEventos{TEvento}"/>, en la misma petición.
/// <list type="bullet">
/// <item>Un manejador que falla se registra en el log y no impide a los demás ni a quien publicó.</item>
/// <item>Si el mismo evento se publica otra vez, cada manejador lo recibe una sola vez (ver <see cref="RegistroDeEventosProcesados"/>).</item>
/// <item>Los logs llevan el tipo y el id del evento, nunca su contenido; el id de correlación de la petición
/// sale en cada línea porque el middleware de Treeve.Api abre el ámbito del log.</item>
/// </list>
/// </summary>
internal sealed class BusDeEventosEnMemoria(
    IServiceProvider proveedor,
    RegistroDeEventosProcesados procesados,
    ILogger<BusDeEventosEnMemoria> log) : IPublicadorEventos
{
    public async Task Publicar<TEvento>(TEvento evento, CancellationToken ct)
        where TEvento : IEventoDeDominio
    {
        ArgumentNullException.ThrowIfNull(evento);

        var tipo = typeof(TEvento).Name;
        var manejadores = proveedor.GetServices<IManejadorDeEventos<TEvento>>().ToList();

        log.LogInformation("Evento {Evento} {EventoId} publicado a {Manejadores} manejador(es).", tipo, evento.EventoId, manejadores.Count);

        foreach (var manejador in manejadores)
        {
            var nombre = manejador.GetType().FullName ?? manejador.GetType().Name;

            if (!procesados.Marcar(evento.EventoId, tipo, nombre))
            {
                log.LogInformation("Evento {Evento} {EventoId} ya lo recibió {Manejador}: se omite.", tipo, evento.EventoId, nombre);
                continue;
            }

            try
            {
                await manejador.Manejar(evento, ct);
            }
            catch (OperationCanceledException)
            {
                procesados.Olvidar(evento.EventoId, tipo, nombre);
                throw;
            }
            catch (Exception ex)
            {
                procesados.Olvidar(evento.EventoId, tipo, nombre);
                log.LogError(ex, "Falló {Manejador} al manejar {Evento} {EventoId}.", nombre, tipo, evento.EventoId);
            }
        }
    }
}
