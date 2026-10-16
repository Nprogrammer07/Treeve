using Treeve.Application.Comun;

namespace Treeve.Api.Endpoints.Salud;

public sealed record EstadoDeSaludResponse(string Estado, string BaseDeDatos);

public static class SaludEndpoints
{
    public static IEndpointRouteBuilder MapSaludEndpoints(this IEndpointRouteBuilder app)
    {
        // /health (en Program.cs) solo dice que el proceso vive. Este además valida la base de datos.
        app.MapGet("/health/ready", async (VerificarSalud verificarSalud, CancellationToken ct) =>
        {
            var estado = await verificarSalud.Ejecutar(ct);
            var respuesta = new EstadoDeSaludResponse(
                estado.EstaSano ? "sano" : "degradado",
                estado.BaseDeDatosDisponible ? "disponible" : "no disponible");

            return Results.Json(
                respuesta,
                statusCode: estado.EstaSano ? StatusCodes.Status200OK : StatusCodes.Status503ServiceUnavailable);
        });

        return app;
    }
}
