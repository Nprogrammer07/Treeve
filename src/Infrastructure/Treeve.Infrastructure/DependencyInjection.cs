using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Treeve.Application.Comun;
using Treeve.Application.Identidad;
using Treeve.Application.MensajesApoyo;
using Treeve.Domain.Services.Administracion;
using Treeve.Domain.Services.Desahogos;
using Treeve.Domain.Services.EspacioVerde;
using Treeve.Domain.Services.Identidad;
using Treeve.Domain.Services.MensajesApoyo;
using Treeve.Domain.Services.Notificaciones;
using Treeve.Domain.Services.Sugerencias;
using Treeve.Infrastructure.Comun;
using Treeve.Infrastructure.Eventos;
using Treeve.Infrastructure.MensajesApoyo;
using Treeve.Infrastructure.Persistence;
using Treeve.Infrastructure.Persistence.Administracion;
using Treeve.Infrastructure.Persistence.Desahogos;
using Treeve.Infrastructure.Persistence.EspacioVerde;
using Treeve.Infrastructure.Persistence.Identidad;
using Treeve.Infrastructure.Persistence.MensajesApoyo;
using Treeve.Infrastructure.Persistence.Notificaciones;
using Treeve.Infrastructure.Persistence.Sugerencias;
using Treeve.Infrastructure.Seguridad;

namespace Treeve.Infrastructure;

/// <summary>
/// Registra las implementaciones de infraestructura de las interfaces del núcleo:
/// repositorios (Persistence/), cifrado de datos sensibles, bus de eventos en memoria, reloj.
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        var cadenaDeConexion = configuration.GetConnectionString("Treeve")
            ?? throw new InvalidOperationException(
                "Falta la cadena de conexión ConnectionStrings:Treeve (variable de entorno ConnectionStrings__Treeve).");

        services.AddDbContext<TreeveDbContext>(opciones => opciones.UseNpgsql(
            cadenaDeConexion,
            npgsql => npgsql.MigrationsHistoryTable("__EFMigrationsHistory", TreeveDbContext.Esquema)));

        services.AddScoped<IVerificadorDeBaseDeDatos, VerificadorDeBaseDeDatosPostgres>();

        // ADR-002: la llave llega por el entorno y nunca vive en la base de datos ni en el repositorio.
        services.AddSingleton<ICifradorDeDatosSensibles>(new CifradorAesGcm(LeerLlaveDeCifrado(configuration)));

        // Identidad (HU-02, HU-03a)
        services.AddSingleton<IReloj, RelojDelSistema>();
        services.AddSingleton<IHasheadorDeContrasenas, HasheadorDeContrasenasPbkdf2>();
        services.AddSingleton<IEmisorDeTokens, EmisorDeTokensAleatorios>();
        services.AddScoped<IRepositorioUsuarios, RepositorioUsuariosPostgres>();
        services.AddScoped<IRepositorioCredenciales, RepositorioCredencialesPostgres>();
        services.AddScoped<IRepositorioSesiones, RepositorioSesionesPostgres>();

        // Roles y auditoría de accesos (HU-10); gestión de staff, su log y los avisos a la persona (HU-12)
        services.AddScoped<IRepositorioAuditoria, RepositorioAuditoriaPostgres>();
        services.AddScoped<IRepositorioCambiosDeRol, RepositorioCambiosDeRolPostgres>();
        services.AddScoped<IRepositorioNotificaciones, RepositorioNotificacionesPostgres>();

        // Eventos de dominio (TEC-03): bus en memoria. Los manejadores se registran en Treeve.Api/Composition
        // como IManejadorDeEventos<TEvento>.
        services.AddSingleton<RegistroDeEventosProcesados>();
        services.AddScoped<IPublicadorEventos, BusDeEventosEnMemoria>();

        // Mensajes de apoyo (HU-06a-1): el contenido se lee una vez del JSON; el historial va cifrado en la base.
        services.AddSingleton<IRepositorioFragmentos, RepositorioFragmentosJson>();
        services.AddSingleton<IGeneradorDeSemillas, SemillasAleatorias>();
        services.AddScoped<IHistorialRespuestas, HistorialRespuestasPostgres>();

        // Desahogos (HU-05): el texto se guarda cifrado
        services.AddScoped<IRepositorioNotas, RepositorioNotasPostgres>();

        // Espacio verde (HU-07a): un riego por desahogo; el estado del lote se calcula a partir de ellos
        services.AddScoped<IRepositorioRiegos, RepositorioRiegosPostgres>();

        // Sugerencias (HU-09)
        services.AddScoped<IRepositorioSugerencias, RepositorioSugerenciasPostgres>();
        return services;
    }

    private static byte[] LeerLlaveDeCifrado(IConfiguration configuration)
    {
        const string Ayuda = "Cifrado:Llave (variable de entorno Cifrado__Llave) debe ser una llave de 32 bytes en Base64.";

        var valor = configuration["Cifrado:Llave"]
            ?? throw new InvalidOperationException($"Falta la llave de cifrado. {Ayuda}");

        try
        {
            var llave = Convert.FromBase64String(valor);
            return llave.Length == CifradorAesGcm.TamanoDeLlave ? llave : throw new InvalidOperationException(Ayuda);
        }
        catch (FormatException)
        {
            throw new InvalidOperationException(Ayuda);
        }
    }
}
