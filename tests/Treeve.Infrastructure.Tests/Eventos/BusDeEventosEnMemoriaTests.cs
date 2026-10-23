using Microsoft.Extensions.Logging;
using Treeve.Application.Comun;
using Treeve.Domain.Desahogos;
using Treeve.Infrastructure.Eventos;

namespace Treeve.Infrastructure.Tests.Eventos;

public class BusDeEventosEnMemoriaTests
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 23, 9, 0, 0, TimeSpan.Zero);

    private readonly RegistroDeEventosProcesados registro = new();
    private readonly LogEnMemoria log = new();

    private static NotaCreada UnaNota() => new(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Emocion.Tristeza, Ahora);

    private BusDeEventosEnMemoria Bus(params IManejadorDeEventos<NotaCreada>[] manejadores) =>
        new(new ProveedorDeManejadores(manejadores), registro, log);

    [Fact]
    public async Task Entrega_el_evento_a_todos_los_manejadores()
    {
        var uno = new ManejadorQueCuenta();
        var otro = new OtroManejadorQueCuenta();
        var evento = UnaNota();

        await Bus(uno, otro).Publicar(evento, CancellationToken.None);

        Assert.Equal(evento, Assert.Single(uno.Recibidos));
        Assert.Equal(evento, Assert.Single(otro.Recibidos));
    }

    [Fact]
    public async Task Publicar_sin_manejadores_no_falla()
    {
        await Bus().Publicar(UnaNota(), CancellationToken.None);
    }

    [Fact]
    public async Task Un_evento_repetido_no_se_procesa_dos_veces_por_el_mismo_manejador()
    {
        var manejador = new ManejadorQueCuenta();
        var bus = Bus(manejador);
        var evento = UnaNota();

        await bus.Publicar(evento, CancellationToken.None);
        await bus.Publicar(evento, CancellationToken.None);

        Assert.Single(manejador.Recibidos);
    }

    [Fact]
    public async Task Dos_eventos_distintos_se_procesan_los_dos()
    {
        var manejador = new ManejadorQueCuenta();
        var bus = Bus(manejador);

        await bus.Publicar(UnaNota(), CancellationToken.None);
        await bus.Publicar(UnaNota(), CancellationToken.None);

        Assert.Equal(2, manejador.Recibidos.Count);
    }

    [Fact]
    public async Task Un_manejador_que_falla_no_impide_a_los_demas_ni_a_quien_publica()
    {
        var sano = new ManejadorQueCuenta();

        await Bus(new ManejadorQueFalla(), sano).Publicar(UnaNota(), CancellationToken.None);

        Assert.Single(sano.Recibidos);
        Assert.Contains(log.Lineas, l => l.Nivel == LogLevel.Error);
    }

    [Fact]
    public async Task Tras_un_fallo_el_mismo_evento_puede_reintentarse()
    {
        var manejador = new ManejadorQueFallaUnaVez();
        var bus = Bus(manejador);
        var evento = UnaNota();

        await bus.Publicar(evento, CancellationToken.None);
        await bus.Publicar(evento, CancellationToken.None);

        Assert.Equal(2, manejador.Intentos);
        Assert.Equal(evento, Assert.Single(manejador.Exitosos));
    }

    [Fact]
    public async Task Una_cancelacion_se_propaga()
    {
        var manejador = new ManejadorQueCuenta();
        var bus = Bus(new ManejadorCancelado(), manejador);
        var evento = UnaNota();

        await Assert.ThrowsAsync<OperationCanceledException>(() => bus.Publicar(evento, CancellationToken.None));

        Assert.Empty(manejador.Recibidos);
    }

    [Fact]
    public async Task El_log_nombra_el_evento_y_su_id_pero_no_lo_que_lleva()
    {
        var evento = UnaNota();

        await Bus(new ManejadorQueFalla(), new ManejadorQueCuenta()).Publicar(evento, CancellationToken.None);

        var texto = string.Join('\n', log.Lineas.Select(l => l.Mensaje));
        Assert.Contains(nameof(NotaCreada), texto, StringComparison.Ordinal);
        Assert.Contains(evento.EventoId.ToString(), texto, StringComparison.Ordinal);
        Assert.DoesNotContain(evento.UsuarioId.ToString(), texto, StringComparison.Ordinal);
        Assert.DoesNotContain(evento.NotaId.ToString(), texto, StringComparison.Ordinal);
    }

    [Fact]
    public void El_registro_olvida_lo_mas_viejo_cuando_se_llena()
    {
        var chico = new RegistroDeEventosProcesados(2);
        var (a, b, c) = (Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());

        Assert.True(chico.Marcar(a, "E", "M"));
        Assert.True(chico.Marcar(b, "E", "M"));
        Assert.True(chico.Marcar(c, "E", "M")); // saca a "a"

        Assert.False(chico.Marcar(b, "E", "M"));
        Assert.False(chico.Marcar(c, "E", "M"));
        Assert.True(chico.Marcar(a, "E", "M"));
    }

    [Fact]
    public void El_registro_distingue_manejador_y_tipo_de_evento()
    {
        var id = Guid.NewGuid();

        Assert.True(new RegistroDeEventosProcesados().Marcar(id, "E", "M1"));

        var registroUnico = new RegistroDeEventosProcesados();
        Assert.True(registroUnico.Marcar(id, "E", "M1"));
        Assert.True(registroUnico.Marcar(id, "E", "M2"));
        Assert.True(registroUnico.Marcar(id, "Otro", "M1"));
        Assert.False(registroUnico.Marcar(id, "E", "M1"));
    }

    private sealed class ManejadorQueCuenta : IManejadorDeEventos<NotaCreada>
    {
        public List<NotaCreada> Recibidos { get; } = [];

        public Task Manejar(NotaCreada evento, CancellationToken ct)
        {
            Recibidos.Add(evento);
            return Task.CompletedTask;
        }
    }

    /// <summary>Otro manejador distinto: el bus los distingue por su tipo.</summary>
    private sealed class OtroManejadorQueCuenta : IManejadorDeEventos<NotaCreada>
    {
        public List<NotaCreada> Recibidos { get; } = [];

        public Task Manejar(NotaCreada evento, CancellationToken ct)
        {
            Recibidos.Add(evento);
            return Task.CompletedTask;
        }
    }

    private sealed class ManejadorQueFalla : IManejadorDeEventos<NotaCreada>
    {
        public Task Manejar(NotaCreada evento, CancellationToken ct) => throw new InvalidOperationException("falla de prueba");
    }

    private sealed class ManejadorCancelado : IManejadorDeEventos<NotaCreada>
    {
        public Task Manejar(NotaCreada evento, CancellationToken ct) => throw new OperationCanceledException();
    }

    private sealed class ManejadorQueFallaUnaVez : IManejadorDeEventos<NotaCreada>
    {
        public int Intentos { get; private set; }
        public List<NotaCreada> Exitosos { get; } = [];

        public Task Manejar(NotaCreada evento, CancellationToken ct)
        {
            Intentos++;
            if (Intentos == 1)
            {
                throw new InvalidOperationException("falla de prueba");
            }

            Exitosos.Add(evento);
            return Task.CompletedTask;
        }
    }

    /// <summary>Hace lo que haría el contenedor: entrega la lista de manejadores de un evento.</summary>
    private sealed class ProveedorDeManejadores(IManejadorDeEventos<NotaCreada>[] manejadores) : IServiceProvider
    {
        public object? GetService(Type serviceType) =>
            serviceType == typeof(IEnumerable<IManejadorDeEventos<NotaCreada>>) ? manejadores : null;
    }

    private sealed class LogEnMemoria : ILogger<BusDeEventosEnMemoria>
    {
        public List<(LogLevel Nivel, string Mensaje)> Lineas { get; } = [];

        public IDisposable? BeginScope<TState>(TState state)
            where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) =>
            Lineas.Add((logLevel, formatter(state, exception)));
    }
}
