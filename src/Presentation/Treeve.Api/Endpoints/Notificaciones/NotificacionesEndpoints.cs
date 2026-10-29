using System.Security.Claims;
using Treeve.Api.Autenticacion;
using Treeve.Application.Notificaciones;
using Treeve.Domain.Notificaciones;

namespace Treeve.Api.Endpoints.Notificaciones;

public sealed record NotificacionResponse(Guid NotificacionId, string Tipo, string Mensaje, DateTimeOffset CreadaEn, bool Leida);

public sealed record MisNotificacionesResponse(IReadOnlyList<NotificacionResponse> Notificaciones);

public static class NotificacionesEndpoints
{
    public static IEndpointRouteBuilder MapNotificacionesEndpoints(this IEndpointRouteBuilder app)
    {
        // HU-12: avisos dentro de la aplicación. Cada persona ve y marca solo los suyos; la persona sale del token.
        var grupo = app.MapGroup("/api/notificaciones").RequireAuthorization();

        grupo.MapGet("/", async (ClaimsPrincipal usuario, ListarMisNotificaciones listar, CancellationToken ct) =>
        {
            var propias = await listar.Ejecutar(usuario.ObtenerUsuarioId(), ct);

            return Results.Ok(new MisNotificacionesResponse(
                [.. propias.Select(n => new NotificacionResponse(n.NotificacionId, ATexto(n.Tipo), n.Mensaje, n.CreadaEn, n.Leida))]));
        });

        // Si no existe o es de otra persona, responde igual (403), para no revelar que existe.
        grupo.MapPost("/{notificacionId:guid}/leida", async (Guid notificacionId, ClaimsPrincipal usuario, MarcarNotificacionLeida marcar, CancellationToken ct) =>
        {
            await marcar.Ejecutar(usuario.ObtenerUsuarioId(), notificacionId, ct);
            return Results.NoContent();
        });

        return app;
    }

    private static string ATexto(TipoDeNotificacion tipo) => tipo switch
    {
        TipoDeNotificacion.AscendidoAStaff => "ascendido_a_staff",
        TipoDeNotificacion.StaffRevocado => "staff_revocado",
        _ => throw new ArgumentOutOfRangeException(nameof(tipo)),
    };
}
