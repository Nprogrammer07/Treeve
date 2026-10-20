using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using Treeve.Application.Identidad;

namespace Treeve.Api.Autenticacion;

/// <summary>
/// Autenticación por token de sesión (cabecera "Authorization: Bearer ..."). Delega la decisión en el
/// caso de uso ValidarSesion: aquí solo se traduce entre HTTP y el núcleo.
/// </summary>
public sealed class SesionAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> opciones,
    ILoggerFactory logger,
    UrlEncoder encoder,
    ValidarSesion validarSesion) : AuthenticationHandler<AuthenticationSchemeOptions>(opciones, logger, encoder)
{
    public const string Esquema = "Sesion";

    private const string Prefijo = "Bearer ";

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var cabecera = Request.Headers.Authorization.ToString();
        if (!cabecera.StartsWith(Prefijo, StringComparison.OrdinalIgnoreCase))
        {
            return AuthenticateResult.NoResult();
        }

        var usuarioId = await validarSesion.Ejecutar(cabecera[Prefijo.Length..].Trim(), Context.RequestAborted);
        if (usuarioId is null)
        {
            return AuthenticateResult.Fail("Sesión inválida o vencida.");
        }

        var identidad = new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, usuarioId.Value.ToString())], Esquema);
        return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identidad), Esquema));
    }
}
