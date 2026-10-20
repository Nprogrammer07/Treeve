using Treeve.Application.Comun;
using Treeve.Application.Identidad;

namespace Treeve.Api.Composition;

/// <summary>
/// Registra los casos de uso del anillo Application. Vive en la capa externa porque el
/// núcleo no conoce el contenedor de dependencias.
/// </summary>
public static class ApplicationServices
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<VerificarSalud>();

        // Identidad (HU-02)
        services.AddScoped<AbridorDeSesiones>();
        services.AddScoped<RegistrarUsuario>();
        services.AddScoped<ValidarSesion>();

        // Ejemplo: services.AddScoped<CrearNota>();
        return services;
    }
}
