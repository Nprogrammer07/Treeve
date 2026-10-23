using Treeve.Application.Comun;
using Treeve.Application.Desahogos;
using Treeve.Application.MensajesApoyo;
using Treeve.Application.Tests.Identidad;
using Treeve.Application.Tests.MensajesApoyo;
using Treeve.Domain.Comun;
using Treeve.Domain.Desahogos;
using Treeve.Domain.Identidad;
using Treeve.Domain.MensajesApoyo;
using Treeve.Domain.Services.Desahogos;
using Treeve.Domain.Services.MensajesApoyo;

namespace Treeve.Application.Tests.Desahogos;

internal sealed class RepositorioNotasFalso : IRepositorioNotas
{
    public List<Nota> Guardadas { get; } = [];

    public Task Agregar(Nota nota, CancellationToken ct)
    {
        Guardadas.Add(nota);
        return Task.CompletedTask;
    }

    public Task<Nota?> ObtenerPorId(Guid notaId, CancellationToken ct) =>
        Task.FromResult(Guardadas.SingleOrDefault(n => n.Id == notaId));
}

internal sealed class PublicadorEventosFalso : IPublicadorEventos
{
    public List<IEventoDeDominio> Publicados { get; } = [];

    public Task Publicar<TEvento>(TEvento evento, CancellationToken ct)
        where TEvento : IEventoDeDominio
    {
        Publicados.Add(evento);
        return Task.CompletedTask;
    }
}

/// <summary>Observa cuándo el motor del mensaje es llamado, para comprobar el orden de los pasos.</summary>
internal sealed class GeneradorQueObserva(Action alGenerar) : IGeneradorMensajeApoyo
{
    public MensajeDeApoyo Generar(PeticionDeMensaje peticion)
    {
        alGenerar();
        return MensajeDeApoyo.DeCrisis("mensaje de prueba");
    }
}

/// <summary>Todo lo que necesitan las pruebas de CrearNota y LeerNota, ya armado, con una persona registrada ("Nico").</summary>
internal sealed class EscenarioDeNotas
{
    public static readonly DateTimeOffset Ahora = new(2026, 10, 23, 9, 30, 0, TimeSpan.FromHours(-5));

    public RepositorioNotasFalso Notas { get; } = new();
    public PublicadorEventosFalso Eventos { get; } = new();
    public CifradorFalso Cifrador { get; } = new();
    public RepositorioUsuariosFalso Usuarios { get; } = new();
    public HistorialRespuestasFalso Historial { get; } = new();
    public GeneradorFalso Generador { get; } = new();
    public Guid UsuarioId { get; } = Guid.NewGuid();
    public CrearNota CrearNota { get; }
    public LeerNota LeerNota { get; }

    public EscenarioDeNotas(Func<EscenarioDeNotas, IGeneradorMensajeApoyo>? generador = null)
    {
        var datos = DatosDeRegistro.Crear("Nicolás Pérez", "Nico", "nico", null, null);
        Usuarios.Guardados.Add(Usuario.Registrar(UsuarioId, datos, null, Ahora));

        var reloj = new RelojManual(Ahora);
        var mensajes = new GenerarMensajeApoyo(
            generador is null ? Generador : generador(this), Historial, Usuarios, Cifrador, new SemillasFijas(), reloj);

        CrearNota = new CrearNota(Notas, Cifrador, reloj, Eventos, mensajes);
        LeerNota = new LeerNota(Notas, Cifrador);
    }
}
