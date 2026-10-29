using System.Security.Claims;
using Treeve.Api.Autenticacion;
using Treeve.Application.EspacioVerde;
using Treeve.Domain.EspacioVerde;

namespace Treeve.Api.Endpoints.EspacioVerde;

public sealed record ComponenteDelLoteResponse(string Componente, int Nivel);

/// <param name="EtapaDelArbol">Con los mismos nombres que la escena: brote, tallo, flor, arbol-adulto.</param>
/// <param name="Nutricion">Desahogos acumulados desde el último crecimiento.</param>
/// <param name="RiegosParaElSiguiente">Desahogos que faltan para que crezca el siguiente componente (0 si está completo).</param>
public sealed record EspacioVerdeResponse(
    string EtapaDelArbol,
    IReadOnlyList<ComponenteDelLoteResponse> Componentes,
    int NivelMaximo,
    int Riegos,
    int Nutricion,
    int RiegosParaElSiguiente,
    string? SiguienteEnCrecer,
    bool Completo);

public static class EspacioVerdeEndpoints
{
    public static IEndpointRouteBuilder MapEspacioVerdeEndpoints(this IEndpointRouteBuilder app)
    {
        // HU-07a: el lote de la persona con sesión. Solo el propio: la persona sale del token.
        app.MapGet("/api/espacio-verde", async (ClaimsPrincipal usuario, ConsultarEspacioVerde consultar, CancellationToken ct) =>
        {
            var lote = await consultar.Ejecutar(usuario.ObtenerUsuarioId(), ct);

            return Results.Ok(new EspacioVerdeResponse(
                ATexto(lote.EtapaDelArbol),
                [.. Enum.GetValues<ComponenteDelLote>().Select(c => new ComponenteDelLoteResponse(ATexto(c), lote.Nivel(c)))],
                ReglaDeCrecimiento.NivelMaximo,
                lote.Riegos,
                lote.Nutricion,
                lote.RiegosParaElSiguiente,
                lote.SiguienteEnCrecer is { } siguiente ? ATexto(siguiente) : null,
                lote.Completo));
        }).RequireAuthorization();

        return app;
    }

    private static string ATexto(EtapaDelArbol etapa) => etapa switch
    {
        EtapaDelArbol.Brote => "brote",
        EtapaDelArbol.Tallo => "tallo",
        EtapaDelArbol.Flor => "flor",
        EtapaDelArbol.ArbolAdulto => "arbol-adulto",
        _ => throw new ArgumentOutOfRangeException(nameof(etapa)),
    };

    private static string ATexto(ComponenteDelLote componente) => componente switch
    {
        ComponenteDelLote.Arbol => "arbol",
        ComponenteDelLote.Flores => "flores",
        ComponenteDelLote.Bosque => "bosque",
        _ => throw new ArgumentOutOfRangeException(nameof(componente)),
    };
}
