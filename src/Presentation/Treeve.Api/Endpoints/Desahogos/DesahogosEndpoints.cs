using System.Security.Claims;
using Treeve.Api.Autenticacion;
using Treeve.Application.Desahogos;
using Treeve.Domain.Comun;
using Treeve.Domain.Desahogos;

namespace Treeve.Api.Endpoints.Desahogos;

public sealed record CrearNotaRequest(string? Emocion, string? Texto)
{
    public override string ToString() => $"CrearNotaRequest {{ Emocion = {Emocion} }}"; // lleva el texto: nunca se imprime
}

public sealed record MensajeDeApoyoResponse(string Texto, bool EsDeCrisis)
{
    public override string ToString() => "[mensaje de apoyo]"; // nombra a la persona: nunca se imprime
}

public sealed record CrearNotaResponse(Guid NotaId, DateTimeOffset CreadaEn, MensajeDeApoyoResponse MensajeDeApoyo);

public sealed record NotaResponse(Guid NotaId, string Emocion, string Texto, DateTimeOffset CreadaEn)
{
    public override string ToString() => "[nota]"; // lleva el texto: nunca se imprime
}

public static class DesahogosEndpoints
{
    public static IEndpointRouteBuilder MapDesahogosEndpoints(this IEndpointRouteBuilder app)
    {
        var grupo = app.MapGroup("/api/desahogos").RequireAuthorization();

        // HU-05: guarda el desahogo cifrado y responde con el mensaje de apoyo (HU-06a-1).
        // La persona sale del token, nunca del cuerpo de la petición.
        grupo.MapPost("/", async (CrearNotaRequest request, ClaimsPrincipal usuario, CrearNota crearNota, CancellationToken ct) =>
        {
            var guardada = await crearNota.Ejecutar(
                usuario.ObtenerUsuarioId(),
                new CrearNotaComando(LeerEmocion(request.Emocion), request.Texto),
                ct);

            var mensaje = new MensajeDeApoyoResponse(guardada.MensajeDeApoyo.Texto, guardada.MensajeDeApoyo.EsDeCrisis);

            return Results.Created($"/api/desahogos/{guardada.NotaId}", new CrearNotaResponse(guardada.NotaId, guardada.CreadaEn, mensaje));
        });

        // Solo la persona dueña puede leer su desahogo; si no existe o es de otra persona, responde igual (403).
        grupo.MapGet("/{notaId:guid}", async (Guid notaId, ClaimsPrincipal usuario, LeerNota leerNota, CancellationToken ct) =>
        {
            var nota = await leerNota.Ejecutar(usuario.ObtenerUsuarioId(), notaId, ct);

            return Results.Ok(new NotaResponse(nota.NotaId, nota.Emocion.ToString().ToLowerInvariant(), nota.Texto, nota.CreadaEn));
        });

        return app;
    }

    /// <summary>Traduce "tristeza", "rabia"… (sin distinguir mayúsculas) a la emoción. Los números no valen.</summary>
    private static Emocion LeerEmocion(string? valor) =>
        Enum.GetValues<Emocion>().Cast<Emocion?>().FirstOrDefault(e => string.Equals(e.ToString(), valor, StringComparison.OrdinalIgnoreCase))
        ?? throw new ExcepcionDeDominio("Elige una emoción: tristeza, rabia, miedo, duda o felicidad.");
}
