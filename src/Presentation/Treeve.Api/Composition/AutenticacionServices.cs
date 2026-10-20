using Microsoft.AspNetCore.Authentication;
using Treeve.Api.Autenticacion;

namespace Treeve.Api.Composition;

public static class AutenticacionServices
{
    public static IServiceCollection AddAutenticacion(this IServiceCollection services)
    {
        services
            .AddAuthentication(SesionAuthenticationHandler.Esquema)
            .AddScheme<AuthenticationSchemeOptions, SesionAuthenticationHandler>(SesionAuthenticationHandler.Esquema, null);

        services.AddAuthorization();
        return services;
    }
}
