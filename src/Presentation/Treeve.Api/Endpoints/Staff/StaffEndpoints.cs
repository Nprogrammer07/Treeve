using System.Security.Claims;
using Treeve.Api.Autenticacion;
using Treeve.Domain.Identidad;

namespace Treeve.Api.Endpoints.Staff;

public sealed record AccesoStaffResponse(string Rol);

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

        // Aquí se agregarán las rutas de HU-11 (sugerencias) y, con RequiereRol(Rol.Administrador), las de HU-12.
        return app;
    }
}
