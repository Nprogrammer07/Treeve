using System.Security.Claims;
using Treeve.Api.Autenticacion;
using Treeve.Api.Endpoints.Sugerencias;
using Treeve.Application.Sugerencias;
using Treeve.Domain.Identidad;

namespace Treeve.Api.Endpoints.Staff;

public sealed record AccesoStaffResponse(string Rol);

public sealed record SugerenciaDeStaffResponse(
    Guid SugerenciaId,
    Guid UsuarioId,
    string NombreDeUsuario,
    string Texto,
    string Estado,
    DateTimeOffset CreadaEn,
    string? Comentario,
    DateTimeOffset? GestionadaEn)
{
    public override string ToString() => "[sugerencia]";
}

/// <summary>
/// HU-11: los dos campos son opcionales, pero debe venir al menos uno. Sin <c>comentario</c> el comentario no cambia;
/// con <c>""</c> se quita.
/// </summary>
public sealed record GestionarSugerenciaRequest(string? Estado, string? Comentario)
{
    public override string ToString() => "[gestionar sugerencia]"; // el comentario es texto libre: nunca se imprime
}

/// <param name="HuboCambios">false si se envió lo mismo que ya tenía: no se guardó nada ni se avisó a la persona.</param>
public sealed record SugerenciaGestionadaResponse(
    Guid SugerenciaId, string Estado, string? Comentario, DateTimeOffset? GestionadaEn, bool HuboCambios)
{
    public override string ToString() => "[sugerencia gestionada]";
}

public sealed record ListadoDeSugerenciasResponse(IReadOnlyList<SugerenciaDeStaffResponse> Sugerencias, bool HayMas);

public static class StaffEndpoints
{
    public static IEndpointRouteBuilder MapStaffEndpoints(this IEndpointRouteBuilder app)
    {
        // HU-10: todo lo que cuelga de /api/staff exige sesión y rol de staff o administración, validado en cada petición.
        var grupo = app.MapGroup("/api/staff").RequireAuthorization().RequiereRol(Rol.Staff);

        // Punto de acceso al panel: el frontend lo llama al entrar a la zona de staff. 200 con el rol, 403 si la persona
        // no es staff (queda registrado en la auditoría), 401 sin sesión.
        grupo.MapGet("/acceso", (ClaimsPrincipal usuario) =>
            Results.Ok(new AccesoStaffResponse(usuario.FindFirstValue(ClaimTypes.Role)!.ToLowerInvariant())));

        // HU-09 (RNF de mantenibilidad): el staff filtra las sugerencias por estado, fecha o usuario, con paginación.
        // HU-11: y las ordena (orden=recientes, antiguas o usuario).
        // Todos los parámetros son opcionales y se combinan; "hasta" no se incluye.
        // El caso de uso autoriza por su cuenta (recibe quién pregunta y desde dónde); el filtro del grupo es la primera barrera.
        grupo.MapGet("/sugerencias", async (
            string? estado, string? desde, string? hasta, string? usuario, int? limite, int? desplazamiento, string? orden,
            HttpContext http, BuscarSugerencias buscar, CancellationToken ct) =>
        {
            var pagina = await buscar.Ejecutar(
                http.User.ObtenerUsuarioId(),
                http.ObtenerContextoDeAcceso(),
                new BuscarSugerenciasComando(
                    EstadosDeSugerenciaEnLaApi.Leer(estado),
                    EstadosDeSugerenciaEnLaApi.LeerFecha(desde, "desde"),
                    EstadosDeSugerenciaEnLaApi.LeerFecha(hasta, "hasta"),
                    usuario,
                    limite,
                    desplazamiento,
                    EstadosDeSugerenciaEnLaApi.LeerOrden(orden)),
                ct);

            return Results.Ok(new ListadoDeSugerenciasResponse(
                [.. pagina.Sugerencias.Select(s => new SugerenciaDeStaffResponse(
                    s.SugerenciaId, s.UsuarioId, s.NombreDeUsuario, s.Texto, EstadosDeSugerenciaEnLaApi.ATexto(s.Estado), s.CreadaEn, s.Comentario, s.GestionadaEn))],
                pagina.HayMas));
        });

        // HU-11: cambiar el estado, comentar o ambas cosas. Quien sugirió ve el comentario en su historial y recibe un aviso.
        grupo.MapPatch("/sugerencias/{sugerenciaId:guid}", async (
            Guid sugerenciaId, GestionarSugerenciaRequest request, HttpContext http, GestionarSugerencia gestionar, CancellationToken ct) =>
        {
            var resultado = await gestionar.Ejecutar(
                http.User.ObtenerUsuarioId(),
                http.ObtenerContextoDeAcceso(),
                new GestionarSugerenciaComando(sugerenciaId, EstadosDeSugerenciaEnLaApi.Leer(request.Estado), request.Comentario),
                ct);

            return Results.Ok(new SugerenciaGestionadaResponse(
                resultado.SugerenciaId,
                EstadosDeSugerenciaEnLaApi.ATexto(resultado.Estado),
                resultado.Comentario,
                resultado.GestionadaEn,
                resultado.HuboCambios));
        });

        return app;
    }
}
