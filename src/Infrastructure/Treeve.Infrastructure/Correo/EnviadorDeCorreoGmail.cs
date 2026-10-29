using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Treeve.Application.Comun;
using Treeve.Application.Identidad;

namespace Treeve.Infrastructure.Correo;

/// <summary>
/// Envía correo con la API de Gmail por HTTPS (ADR-008). Railway bloquea el SMTP saliente en varios planes; HTTPS
/// funciona siempre. Con el refresh token pide un access token a Google, lo guarda hasta que vence y manda el mensaje.
/// En los registros solo queda el estado HTTP y el código de error de Google: nunca el destinatario ni el enlace.
/// </summary>
internal sealed class EnviadorDeCorreoGmail(
    HttpClient http,
    OpcionesDeGmail opciones,
    IReloj reloj,
    ILogger<EnviadorDeCorreoGmail> log) : IEnviadorDeCorreo
{
    /// <summary>Se renueva un poco antes de que venza, para no mandar un token a punto de caducar.</summary>
    private static readonly TimeSpan Margen = TimeSpan.FromSeconds(60);

    private readonly SemaphoreSlim cerrojo = new(1, 1);
    private string? accessToken;
    private DateTimeOffset venceEn;

    public async Task Enviar(MensajeDeCorreo mensaje, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(mensaje);

        var cuerpo = JsonSerializer.Serialize(new { raw = ConstructorDeMensajeMime.Construir(opciones.Remitente, mensaje) });

        try
        {
            var respuesta = await Mandar(cuerpo, forzarTokenNuevo: false, ct);

            if (respuesta == HttpStatusCode.Unauthorized)
            {
                // El access token pudo quedar revocado antes de vencer: se pide uno nuevo y se reintenta una vez.
                respuesta = await Mandar(cuerpo, forzarTokenNuevo: true, ct);
            }

            if (respuesta is not (HttpStatusCode.OK or HttpStatusCode.Accepted))
            {
                throw new ErrorDeEnvioDeCorreo($"Gmail respondió {(int)respuesta}.");
            }
        }
        catch (ErrorDeEnvioDeCorreo ex)
        {
            log.LogError("No se pudo enviar el correo de recuperación: {Motivo}", ex.Message);
            throw;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            log.LogError(ex, "No se pudo enviar el correo de recuperación: falló la conexión con Google.");
            throw new ErrorDeEnvioDeCorreo("Falló la conexión con Google.", ex);
        }
    }

    private async Task<HttpStatusCode> Mandar(string cuerpo, bool forzarTokenNuevo, CancellationToken ct)
    {
        var token = await ObtenerAccessToken(forzarTokenNuevo, ct);

        using var peticion = new HttpRequestMessage(HttpMethod.Post, opciones.UrlDeEnvio)
        {
            Content = new StringContent(cuerpo, Encoding.UTF8, "application/json"),
        };
        peticion.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        using var respuesta = await http.SendAsync(peticion, ct);

        if (!respuesta.IsSuccessStatusCode && respuesta.StatusCode != HttpStatusCode.Unauthorized)
        {
            log.LogError("Gmail rechazó el envío (HTTP {Estado}, {Motivo}).", (int)respuesta.StatusCode, await LeerMotivo(respuesta, ct));
        }

        return respuesta.StatusCode;
    }

    private async Task<string> ObtenerAccessToken(bool forzarNuevo, CancellationToken ct)
    {
        await cerrojo.WaitAsync(ct);
        try
        {
            if (!forzarNuevo && accessToken is not null && reloj.Ahora < venceEn - Margen)
            {
                return accessToken;
            }

            using var peticion = new HttpRequestMessage(HttpMethod.Post, opciones.UrlDeToken)
            {
                Content = new FormUrlEncodedContent(new Dictionary<string, string>
                {
                    ["client_id"] = opciones.ClientId,
                    ["client_secret"] = opciones.ClientSecret,
                    ["refresh_token"] = opciones.RefreshToken,
                    ["grant_type"] = "refresh_token",
                }),
            };

            using var respuesta = await http.SendAsync(peticion, ct);

            if (!respuesta.IsSuccessStatusCode)
            {
                // Lo normal aquí es "invalid_grant": el refresh token venció o se revocó y hay que sacar otro.
                var motivo = await LeerMotivo(respuesta, ct);
                log.LogError("Google no entregó un access token (HTTP {Estado}, {Motivo}).", (int)respuesta.StatusCode, motivo);
                throw new ErrorDeEnvioDeCorreo($"Google no entregó un access token ({motivo}).");
            }

            using var json = await JsonDocument.ParseAsync(await respuesta.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
            var raiz = json.RootElement;

            accessToken = raiz.GetProperty("access_token").GetString()
                ?? throw new ErrorDeEnvioDeCorreo("Google respondió sin access token.");
            venceEn = reloj.Ahora.AddSeconds(raiz.TryGetProperty("expires_in", out var segundos) ? segundos.GetInt32() : 3600);

            return accessToken;
        }
        finally
        {
            cerrojo.Release();
        }
    }

    /// <summary>Código de error de Google (por ejemplo invalid_grant), sin copiar el resto de la respuesta.</summary>
    private static async Task<string> LeerMotivo(HttpResponseMessage respuesta, CancellationToken ct)
    {
        try
        {
            using var json = await JsonDocument.ParseAsync(await respuesta.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
            var error = json.RootElement.GetProperty("error");

            return error.ValueKind == JsonValueKind.String
                ? error.GetString() ?? "desconocido"
                : error.TryGetProperty("status", out var estado) ? estado.GetString() ?? "desconocido" : "desconocido";
        }
        catch (Exception ex) when (ex is JsonException or KeyNotFoundException or InvalidOperationException)
        {
            return "desconocido";
        }
    }
}
