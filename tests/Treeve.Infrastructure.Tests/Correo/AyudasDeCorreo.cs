using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Treeve.Application.Comun;
using Treeve.Infrastructure.Correo;

namespace Treeve.Infrastructure.Tests.Correo;

internal static partial class AyudasDeCorreo
{
    public static readonly OpcionesDeGmail Opciones = new("id-del-cliente", "secreto-del-cliente", "refresh-token-secreto", "treeve@gmail.com")
    {
        UrlDeToken = "https://google.test/token",
        UrlDeEnvio = "https://google.test/send",
    };

    public static readonly MensajeDeCorreo Mensaje = new(
        "ana@correo.com", "Restablece tu contraseña", "Hola Ani, abre https://treeve.test/r?token=abc", "<p>Hola Ani</p>");

    /// <summary>Decodifica el campo raw (Base64 URL-safe) que recibe la API de Gmail.</summary>
    public static string DecodificarRaw(string raw)
    {
        var base64 = raw.Replace('-', '+').Replace('_', '/');
        base64 = base64.PadRight(base64.Length + ((4 - (base64.Length % 4)) % 4), '=');

        return Encoding.UTF8.GetString(Convert.FromBase64String(base64));
    }

    /// <summary>Contenido de cada parte (texto y html) de un mensaje multipart ya decodificado.</summary>
    public static List<string> Partes(string mime) =>
        [.. ParteBase64().Matches(mime).Select(m => Encoding.UTF8.GetString(Convert.FromBase64String(m.Groups[1].Value.Replace("\r\n", string.Empty, StringComparison.Ordinal))))];

    [GeneratedRegex(@"Content-Transfer-Encoding: base64\r\n\r\n(.*?)\r\n\r\n", RegexOptions.Singleline)]
    private static partial Regex ParteBase64();
}

internal sealed class RelojDePrueba(DateTimeOffset inicio) : IReloj
{
    public DateTimeOffset Ahora { get; private set; } = inicio;

    public void Avanzar(TimeSpan tiempo) => Ahora += tiempo;
}

internal sealed class LogDePrueba<T> : ILogger<T>
{
    public List<(LogLevel Nivel, string Mensaje)> Lineas { get; } = [];

    public IDisposable? BeginScope<TState>(TState state)
        where TState : notnull => null;

    public bool IsEnabled(LogLevel logLevel) => true;

    public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) =>
        Lineas.Add((logLevel, formatter(state, exception) + (exception is null ? string.Empty : " " + exception.Message)));
}

/// <summary>Responde con lo que diga la prueba y guarda cada petición para revisarla después.</summary>
internal sealed class ManejadorHttpFalso(Func<HttpRequestMessage, string, HttpResponseMessage> responder) : HttpMessageHandler
{
    public List<(Uri Url, string Cuerpo, string? Autorizacion)> Peticiones { get; } = [];

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var cuerpo = request.Content is null ? string.Empty : await request.Content.ReadAsStringAsync(cancellationToken);
        Peticiones.Add((request.RequestUri!, cuerpo, request.Headers.Authorization?.ToString()));

        return responder(request, cuerpo);
    }
}
