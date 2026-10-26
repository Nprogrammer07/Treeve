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
    DateTimeOffset CreadaEn)
{
    public override string ToString() => "[sugerencia]";
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
        // Todos los parámetros son opcionales y se combinan; "hasta" no se incluye.
        grupo.MapGet("/sugerencias", async (
            string? estado, string? desde, string? hasta, string? usuario, int? limite, int? desplazamiento,
            BuscarSugerencias buscar, CancellationToken ct) =>
        {
            var pagina = await buscar.Ejecutar(
                new BuscarSugerenciasComando(
                    EstadosDeSugerenciaEnLaApi.Leer(estado),
                    EstadosDeSugerenciaEnLaApi.LeerFecha(desde, "desde"),
                    EstadosDeSugerenciaEnLaApi.LeerFecha(hasta, "hasta"),
                    usuario,
                    limite,
                    desplazamiento),
                ct);

            return Results.Ok(new ListadoDeSugerenciasResponse(
                [.. pagina.Sugerencias.Select(s => new SugerenciaDeStaffResponse(
                    s.SugerenciaId, s.UsuarioId, s.NombreDeUsuario, s.Texto, EstadosDeSugerenciaEnLaApi.ATexto(s.Estado), s.CreadaEn))],
                pagina.HayMas));
        });

        // Aquí se agregarán las rutas de HU-11 (cambiar el estado y comentar) y, con RequiereRol(Rol.Administrador), las de HU-12.
        return app;
    }
}
