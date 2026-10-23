using Treeve.Application.MensajesApoyo;
using Treeve.Domain.MensajesApoyo;
using Treeve.Domain.Services.MensajesApoyo;

namespace Treeve.Application.Tests.MensajesApoyo;

/// <summary>Conserva solo las más recientes, como lo hace la base de datos.</summary>
internal sealed class HistorialRespuestasFalso : IHistorialRespuestas
{
    public List<RespuestaRegistrada> Guardadas { get; } = [];

    public Task<IReadOnlyList<RespuestaRegistrada>> ObtenerRecientes(Guid usuarioId, int cantidad, CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<RespuestaRegistrada>>(DeLaPersona(usuarioId).Take(cantidad).ToList());

    public Task Registrar(RespuestaRegistrada respuesta, int conservar, CancellationToken ct)
    {
        Guardadas.Add(respuesta);
        var sobrantes = DeLaPersona(respuesta.UsuarioId).Skip(conservar).ToList();
        Guardadas.RemoveAll(sobrantes.Contains);
        return Task.CompletedTask;
    }

    private IEnumerable<RespuestaRegistrada> DeLaPersona(Guid usuarioId) =>
        Guardadas.Where(r => r.UsuarioId == usuarioId).OrderByDescending(r => r.CreadaEn);
}

/// <summary>Responde siempre con el mismo mensaje y recuerda lo que recibió.</summary>
internal sealed class GeneradorFalso : IGeneradorMensajeApoyo
{
    private int llamadas;

    public bool ResponderCrisis { get; set; }
    public List<PeticionDeMensaje> Recibidas { get; } = [];

    public MensajeDeApoyo Generar(PeticionDeMensaje peticion)
    {
        Recibidas.Add(peticion);
        llamadas++;

        if (ResponderCrisis)
        {
            return MensajeDeApoyo.DeCrisis($"{peticion.Apodo}, mensaje de crisis.");
        }

        // Ids distintos en cada llamada, para seguirles la pista en el historial.
        var fragmentos = new[]
        {
            Fragmento.Crear($"GEN-SAL-{llamadas:00}", Ranura.Saludo, null, [], [], 1, "Hola, {apodo}."),
            Fragmento.Crear($"GEN-VAL-{llamadas:00}", Ranura.Validacion, null, [], [], 1, "Tiene sentido."),
            Fragmento.Crear($"GEN-REF-{llamadas:00}", Ranura.Reflejo, null, [], [], 1, "Se nota."),
            Fragmento.Crear($"GEN-CON-{llamadas:00}", Ranura.Contraste, null, [], [], 1, "Paso a paso."),
            Fragmento.Crear($"GEN-PUE-{llamadas:00}", Ranura.Puente, null, [], [], 1, "Tu árbol creció."),
        };

        return MensajeDeApoyo.Compuesto(fragmentos, peticion.Apodo);
    }
}

internal sealed class SemillasFijas : IGeneradorDeSemillas
{
    public int Nueva() => 42;
}
