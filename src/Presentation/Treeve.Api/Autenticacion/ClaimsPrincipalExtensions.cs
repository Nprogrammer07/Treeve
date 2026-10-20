using System.Security.Claims;
using Treeve.Application.Comun;

namespace Treeve.Api.Autenticacion;

public static class ClaimsPrincipalExtensions
{
    /// <summary>Id del usuario autenticado. El id sale del token, nunca del cuerpo de la petición.</summary>
    public static Guid ObtenerUsuarioId(this ClaimsPrincipal usuario)
    {
        ArgumentNullException.ThrowIfNull(usuario);

        return Guid.TryParse(usuario.FindFirstValue(ClaimTypes.NameIdentifier), out var id)
            ? id
            : throw new AccesoDenegado();
    }
}
