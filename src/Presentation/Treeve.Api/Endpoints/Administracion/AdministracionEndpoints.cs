using Treeve.Api.Autenticacion;
using Treeve.Application.Administracion;
using Treeve.Domain.Identidad;

namespace Treeve.Api.Endpoints.Administracion;

public sealed record AscenderAStaffRequest(string? NombreDeUsuario);

public sealed record MiembroDelStaffResponse(Guid UsuarioId, string NombreDeUsuario, string Apodo, string Rol);

public sealed record StaffResponse(IReadOnlyList<MiembroDelStaffResponse> Staff);

public sealed record CambioDeRolResponse(
    Guid UsuarioId, string NombreDeUsuario, string Apodo, string RolAnterior, string RolNuevo, DateTimeOffset OcurrioEn);

public sealed record RegistroDeCambioDeRolResponse(
    Guid Id,
    Guid AdministradorId,
    string? Administrador,
    Guid UsuarioAfectadoId,
    string? UsuarioAfectado,
    string RolAnterior,
    string RolNuevo,
    DateTimeOffset OcurrioEn);

public sealed record RegistroDeAccesoDenegadoResponse(
    Guid Id, Guid UsuarioId, string? NombreDeUsuario, DateTimeOffset OcurrioEn, string Ip, string Recurso, string RolRequerido)
{
    public override string ToString() => "[acceso denegado]"; // lleva la IP: nunca se imprime
}

public sealed record PaginaDeAuditoriaResponse<T>(IReadOnlyList<T> Registros, bool HayMas);

/// <summary>Cómo viaja un rol por la API: en minúsculas, igual que en <c>/api/staff/acceso</c>.</summary>
public static class RolesEnLaApi
{
    public static string ATexto(Rol rol) => rol.ToString().ToLowerInvariant();
}

public static class AdministracionEndpoints
{
    public static IEndpointRouteBuilder MapAdministracionEndpoints(this IEndpointRouteBuilder app)
    {
        // HU-12: todo lo de /api/admin exige sesión y rol de administración (filtro de HU-10). Además, cada caso de uso
        // vuelve a autorizar por su cuenta: la regla no depende de que la ruta tenga el filtro.
        var grupo = app.MapGroup("/api/admin").RequireAuthorization().RequiereRol(Rol.Administrador);

        grupo.MapGet("/staff", async (HttpContext http, ListarStaff listar, CancellationToken ct) =>
        {
            var staff = await listar.Ejecutar(http.User.ObtenerUsuarioId(), http.ObtenerContextoDeAcceso(), ct);

            return Results.Ok(new StaffResponse(
                [.. staff.Select(m => new MiembroDelStaffResponse(m.UsuarioId, m.NombreDeUsuario, m.Apodo, RolesEnLaApi.ATexto(m.Rol)))]));
        });

        // Ascender: por nombre de usuario, porque quien administra conoce el usuario de la persona, no su id.
        grupo.MapPost("/staff", async (AscenderAStaffRequest request, HttpContext http, AscenderAStaff ascender, CancellationToken ct) =>
        {
            var cambio = await ascender.Ejecutar(http.User.ObtenerUsuarioId(), http.ObtenerContextoDeAcceso(), request.NombreDeUsuario, ct);
            return Results.Ok(ACambioDeRol(cambio));
        });

        // Revocar: por id, que sale del listado de staff.
        grupo.MapDelete("/staff/{usuarioId:guid}", async (Guid usuarioId, HttpContext http, RevocarStaff revocar, CancellationToken ct) =>
        {
            var cambio = await revocar.Ejecutar(http.User.ObtenerUsuarioId(), http.ObtenerContextoDeAcceso(), usuarioId, ct);
            return Results.Ok(ACambioDeRol(cambio));
        });

        // Logs (solo lectura), del más reciente al más antiguo, paginados como el listado de sugerencias.
        grupo.MapGet("/auditoria/roles", async (int? limite, int? desplazamiento, HttpContext http, ConsultarAuditoria consultar, CancellationToken ct) =>
        {
            var pagina = await consultar.CambiosDeRol(http.User.ObtenerUsuarioId(), http.ObtenerContextoDeAcceso(), limite, desplazamiento, ct);

            return Results.Ok(new PaginaDeAuditoriaResponse<RegistroDeCambioDeRolResponse>(
                [.. pagina.Registros.Select(c => new RegistroDeCambioDeRolResponse(
                    c.Id, c.AdministradorId, c.NombreDelAdministrador, c.UsuarioAfectadoId, c.NombreDelUsuarioAfectado,
                    RolesEnLaApi.ATexto(c.RolAnterior), RolesEnLaApi.ATexto(c.RolNuevo), c.OcurrioEn))],
                pagina.HayMas));
        });

        grupo.MapGet("/auditoria/accesos", async (int? limite, int? desplazamiento, HttpContext http, ConsultarAuditoria consultar, CancellationToken ct) =>
        {
            var pagina = await consultar.AccesosDenegados(http.User.ObtenerUsuarioId(), http.ObtenerContextoDeAcceso(), limite, desplazamiento, ct);

            return Results.Ok(new PaginaDeAuditoriaResponse<RegistroDeAccesoDenegadoResponse>(
                [.. pagina.Registros.Select(a => new RegistroDeAccesoDenegadoResponse(
                    a.Id, a.UsuarioId, a.NombreDeUsuario, a.OcurrioEn, a.Ip, a.Recurso, RolesEnLaApi.ATexto(a.RolRequerido)))],
                pagina.HayMas));
        });

        return app;
    }

    private static CambioDeRolResponse ACambioDeRol(CambioDeRolAplicado c) =>
        new(c.UsuarioId, c.NombreDeUsuario, c.Apodo, RolesEnLaApi.ATexto(c.RolAnterior), RolesEnLaApi.ATexto(c.RolNuevo), c.OcurrioEn);
}
