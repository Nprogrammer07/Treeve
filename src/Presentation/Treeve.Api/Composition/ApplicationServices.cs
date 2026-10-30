using Treeve.Application.Administracion;
using Treeve.Application.Comun;
using Treeve.Application.Desahogos;
using Treeve.Application.EspacioVerde;
using Treeve.Application.Identidad;
using Treeve.Application.MensajesApoyo;
using Treeve.Application.Notificaciones;
using Treeve.Application.Sugerencias;
using Treeve.Domain.Administracion;
using Treeve.Domain.Desahogos;
using Treeve.Domain.EspacioVerde;
using Treeve.Domain.Services.MensajesApoyo;
using Treeve.Domain.Sugerencias;

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
        services.AddScoped<AutorizarAcceso>(); // HU-10
        services.AddScoped<SolicitarRecuperacion>(); // HU-03b
        services.AddScoped<RestablecerContrasena>(); // HU-03b

        // Mensajes de apoyo (HU-06a-1). El motor es un servicio de dominio puro; su contenido lo da Infrastructure.
        services.AddSingleton<IGeneradorMensajeApoyo>(
            proveedor => new MotorDeRespuesta(proveedor.GetRequiredService<IRepositorioFragmentos>().ObtenerCatalogo()));
        services.AddScoped<GenerarMensajeApoyo>();

        // Desahogos (HU-05)
        services.AddScoped<CrearNota>();
        services.AddScoped<LeerNota>();

        // Espacio verde (HU-07a). El umbral es configurable (HU-07): EspacioVerde:DesahogosPorCrecimiento.
        services.AddSingleton(proveedor => new ReglaDeCrecimiento(
            proveedor.GetRequiredService<IConfiguration>().GetValue("EspacioVerde:DesahogosPorCrecimiento", ReglaDeCrecimiento.DesahogosPorDefecto)));
        services.AddScoped<IManejadorDeEventos<NotaCreada>, AlCrearseNota>();
        services.AddScoped<ConsultarEspacioVerde>();

        // Sugerencias (HU-09)
        services.AddScoped<EnviarSugerencia>();
        services.AddScoped<ListarMisSugerencias>();
        services.AddScoped<BuscarSugerencias>();
        services.AddScoped<GestionarSugerencia>(); // HU-11

        // Gestión de staff y sus logs (HU-12)
        services.AddScoped<RegistradorDeCambiosDeRol>();
        services.AddScoped<ListarStaff>();
        services.AddScoped<AscenderAStaff>();
        services.AddScoped<RevocarStaff>();
        services.AddScoped<ConsultarAuditoria>();

        // Notificaciones dentro de la aplicación (HU-12): nacen de eventos de dominio (TEC-03).
        services.AddScoped<IManejadorDeEventos<RolCambiado>, AlCambiarRol>();
        services.AddScoped<IManejadorDeEventos<SugerenciaGestionada>, AlGestionarSugerencia>(); // HU-11
        services.AddScoped<ListarMisNotificaciones>();
        services.AddScoped<MarcarNotificacionLeida>();
        return services;
    }
}
