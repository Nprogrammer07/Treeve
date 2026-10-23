using Treeve.Application.Comun;
using Treeve.Application.Desahogos;
using Treeve.Application.Identidad;
using Treeve.Application.MensajesApoyo;
using Treeve.Domain.Services.MensajesApoyo;

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

        // Identidad (HU-02, HU-03a)
        services.AddScoped<AbridorDeSesiones>();
        services.AddScoped<RegistrarUsuario>();
        services.AddScoped<IniciarSesion>();
        services.AddScoped<ValidarSesion>();

        // Mensajes de apoyo (HU-06a-1). El motor es un servicio de dominio puro; su contenido lo da Infrastructure.
        services.AddSingleton<IGeneradorMensajeApoyo>(
            proveedor => new MotorDeRespuesta(proveedor.GetRequiredService<IRepositorioFragmentos>().ObtenerCatalogo()));
        services.AddScoped<GenerarMensajeApoyo>();

        // Desahogos (HU-05)
        services.AddScoped<CrearNota>();
        services.AddScoped<LeerNota>();

        // Ejemplo: services.AddScoped<CrearSugerencia>();
        return services;
    }
}
