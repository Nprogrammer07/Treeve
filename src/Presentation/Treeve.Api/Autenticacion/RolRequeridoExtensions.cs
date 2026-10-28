using System.Security.Claims;
using Treeve.Application.Identidad;
using Treeve.Domain.Identidad;

namespace Treeve.Api.Autenticacion;

public static class RolRequeridoExtensions
{
    /// <summary>
    /// HU-10: la ruta o el grupo solo admite personas con el rol pedido (o uno mayor). Se valida en el backend en cada
    /// petición, con el rol guardado en la base de datos. Debe ir después de <c>RequireAuthorization()</c>: sin sesión
    /// la respuesta es 401 antes de llegar aquí.
    /// </summary>
    public static TBuilder RequiereRol<TBuilder>(this TBuilder builder, Rol requerido)
        where TBuilder : IEndpointConventionBuilder =>
        builder.AddEndpointFilter(async (contexto, siguiente) =>
        {
            var http = contexto.HttpContext;
            var autorizar = http.RequestServices.GetRequiredService<AutorizarAcceso>();

            var rol = await autorizar.Ejecutar(
                http.User.ObtenerUsuarioId(),
                requerido,
                http.ObtenerContextoDeAcceso(),
                http.RequestAborted);

            // El rol sale de la base de datos, no del token: los endpoints pueden leerlo de aquí.
            ((ClaimsIdentity)http.User.Identity!).AddClaim(new Claim(ClaimTypes.Role, rol.ToString()));

            return await siguiente(contexto);
        });
}
