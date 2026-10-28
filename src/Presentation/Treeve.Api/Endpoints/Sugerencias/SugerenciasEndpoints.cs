using System.Globalization;
using System.Security.Claims;
using Treeve.Api.Autenticacion;
using Treeve.Application.Sugerencias;
using Treeve.Domain.Comun;
using Treeve.Domain.Sugerencias;

namespace Treeve.Api.Endpoints.Sugerencias;

public sealed record EnviarSugerenciaRequest(string? Texto)
{
    public override string ToString() => "[sugerencia]"; // texto libre: nunca se imprime
}

public sealed record SugerenciaEnviadaResponse(Guid SugerenciaId, DateTimeOffset CreadaEn, string Estado);

public sealed record SugerenciaPropiaResponse(Guid SugerenciaId, string Texto, string Estado, DateTimeOffset CreadaEn)
{
    public override string ToString() => "[sugerencia]";
}

public sealed record MisSugerenciasResponse(IReadOnlyList<SugerenciaPropiaResponse> Sugerencias);

/// <summary>Cómo viaja el estado por la API: texto en minúsculas, sin tildes ni espacios.</summary>
public static class EstadosDeSugerenciaEnLaApi
{
    public static string ATexto(EstadoSugerencia estado) => estado switch
    {
        EstadoSugerencia.Pendiente => "pendiente",
        EstadoSugerencia.EnRevision => "en_revision",
        EstadoSugerencia.Implementada => "implementada",
        EstadoSugerencia.Rechazada => "rechazada",
        _ => throw new ArgumentOutOfRangeException(nameof(estado)),
    };

    /// <summary>Texto vacío significa "sin filtro". Los números no valen.</summary>
    public static EstadoSugerencia? Leer(string? valor)
    {
        if (string.IsNullOrWhiteSpace(valor))
        {
            return null;
        }

        return Enum.GetValues<EstadoSugerencia>().Cast<EstadoSugerencia?>()
            .FirstOrDefault(e => ATexto(e!.Value) == valor.Trim().ToLowerInvariant())
            ?? throw new ExcepcionDeDominio("El estado debe ser pendiente, en_revision, implementada o rechazada.");
    }

    /// <summary>Fecha ISO 8601 (por ejemplo 2026-10-01 o 2026-10-01T00:00:00-05:00). Sin zona horaria se toma como UTC.</summary>
    public static DateTimeOffset? LeerFecha(string? valor, string campo)
    {
        if (string.IsNullOrWhiteSpace(valor))
        {
            return null;
        }

        return DateTimeOffset.TryParse(valor, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var fecha)
            ? fecha
            : throw new ExcepcionDeDominio($"'{campo}' debe ser una fecha, por ejemplo 2026-10-01.");
    }
}

public static class SugerenciasEndpoints
{
    public static IEndpointRouteBuilder MapSugerenciasEndpoints(this IEndpointRouteBuilder app)
    {
        var grupo = app.MapGroup("/api/sugerencias").RequireAuthorization();

        // HU-09: enviar una sugerencia. La persona sale del token, nunca del cuerpo de la petición.
        grupo.MapPost("/", async (EnviarSugerenciaRequest request, ClaimsPrincipal usuario, EnviarSugerencia enviar, CancellationToken ct) =>
        {
            var enviada = await enviar.Ejecutar(usuario.ObtenerUsuarioId(), new EnviarSugerenciaComando(request.Texto), ct);

            return Results.Created(
                "/api/sugerencias",
                new SugerenciaEnviadaResponse(enviada.SugerenciaId, enviada.CreadaEn, EstadosDeSugerenciaEnLaApi.ATexto(enviada.Estado)));
        });

        // HU-09: historial propio. Solo devuelve las sugerencias de la persona con sesión.
        grupo.MapGet("/", async (ClaimsPrincipal usuario, ListarMisSugerencias listar, CancellationToken ct) =>
        {
            var propias = await listar.Ejecutar(usuario.ObtenerUsuarioId(), ct);

            return Results.Ok(new MisSugerenciasResponse(
                [.. propias.Select(s => new SugerenciaPropiaResponse(s.SugerenciaId, s.Texto, EstadosDeSugerenciaEnLaApi.ATexto(s.Estado), s.CreadaEn))]));
        });

        return app;
    }
}
