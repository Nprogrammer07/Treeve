using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
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
using Treeve.Infrastructure.Correo;
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

        // Recuperación de contraseña por correo (HU-03b, ADR-008)
        services.AddScoped<IRepositorioRecuperaciones, RepositorioRecuperacionesPostgres>();
        AgregarCorreo(services, configuration);

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

    /// <summary>
    /// Correo saliente (ADR-008). Sin credenciales de Gmail la API arranca igual y el envío queda registrado como "no
    /// configurado"; con credenciales a medias se corta el arranque, porque sería un error de despliegue difícil de ver.
    /// </summary>
    private static void AgregarCorreo(IServiceCollection services, IConfiguration configuration)
    {
        var gmail = LeerOpcionesDeGmail(configuration);
        var urlBase = LeerUrlBaseDeRecuperacion(configuration, exigida: gmail is not null);

        if (gmail is null)
        {
            services.AddSingleton<IEnviadorDeCorreo, EnviadorDeCorreoNoConfigurado>();
        }
        else
        {
            services.AddSingleton<IEnviadorDeCorreo>(proveedor => new EnviadorDeCorreoGmail(
                new HttpClient(new SocketsHttpHandler { PooledConnectionLifetime = TimeSpan.FromMinutes(5) })
                {
                    Timeout = TimeSpan.FromSeconds(15),
                },
                gmail,
                proveedor.GetRequiredService<IReloj>(),
                proveedor.GetRequiredService<ILogger<EnviadorDeCorreoGmail>>()));
        }

        services.AddSingleton<INotificadorDeRecuperacion>(
            proveedor => new NotificadorDeRecuperacionPorCorreo(proveedor.GetRequiredService<IEnviadorDeCorreo>(), urlBase));
    }

    private static OpcionesDeGmail? LeerOpcionesDeGmail(IConfiguration configuration)
    {
        const string Ayuda = "Correo:Gmail:ClientId, ClientSecret, RefreshToken y Remitente (variables Correo__Gmail__...) deben definirse todos o ninguno.";

        string? Leer(string clave) => string.IsNullOrWhiteSpace(configuration[$"Correo:Gmail:{clave}"]) ? null : configuration[$"Correo:Gmail:{clave}"]!.Trim();

        var clientId = Leer("ClientId");
        var clientSecret = Leer("ClientSecret");
        var refreshToken = Leer("RefreshToken");
        var remitente = Leer("Remitente");

        if (clientId is null && clientSecret is null && refreshToken is null && remitente is null)
        {
            return null;
        }

        if (clientId is null || clientSecret is null || refreshToken is null || remitente is null)
        {
            throw new InvalidOperationException($"Faltan datos del correo. {Ayuda}");
        }

        if (!System.Net.Mail.MailAddress.TryCreate(remitente, out _) || remitente.Contains('\r', StringComparison.Ordinal) || remitente.Contains('\n', StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Correo:Gmail:Remitente (Correo__Gmail__Remitente) no es una dirección de correo válida.");
        }

        return new OpcionesDeGmail(clientId, clientSecret, refreshToken, remitente);
    }

    /// <summary>
    /// Dirección de la pantalla del frontend que recibe el enlace del correo (<c>Recuperacion__UrlBase</c>). Con el
    /// correo configurado es obligatoria: un enlace a otra dirección dejaría a las personas sin poder recuperar su cuenta.
    /// </summary>
    private static Uri LeerUrlBaseDeRecuperacion(IConfiguration configuration, bool exigida)
    {
        var valor = configuration["Recuperacion:UrlBase"];

        if (string.IsNullOrWhiteSpace(valor))
        {
            return exigida
                ? throw new InvalidOperationException(
                    "Falta Recuperacion:UrlBase (variable Recuperacion__UrlBase), por ejemplo https://tu-frontend.vercel.app/restablecer-contrasena.")
                : new Uri("http://localhost:5173/restablecer-contrasena");
        }

        return Uri.TryCreate(valor.Trim(), UriKind.Absolute, out var url) && url.Scheme is "https" or "http"
            ? url
            : throw new InvalidOperationException("Recuperacion:UrlBase (Recuperacion__UrlBase) debe ser una dirección http(s) completa.");
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
