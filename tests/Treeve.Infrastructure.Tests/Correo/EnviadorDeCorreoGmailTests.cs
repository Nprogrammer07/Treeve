using System.Net;
using System.Text.Json;
using Treeve.Application.Identidad;
using Treeve.Infrastructure.Correo;
using Microsoft.Extensions.Logging;

namespace Treeve.Infrastructure.Tests.Correo;

public class EnviadorDeCorreoGmailTests
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 29, 9, 0, 0, TimeSpan.FromHours(-5));

    private readonly RelojDePrueba reloj = new(Ahora);
    private readonly LogDePrueba<EnviadorDeCorreoGmail> log = new();

    private static HttpResponseMessage Json(HttpStatusCode estado, string json) =>
        new(estado) { Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json") };

    private static HttpResponseMessage TokenValido(int segundos = 3600) =>
        Json(HttpStatusCode.OK, $$"""{"access_token":"acceso-1","expires_in":{{segundos}},"token_type":"Bearer"}""");

    private EnviadorDeCorreoGmail Crear(ManejadorHttpFalso manejador) =>
        new(new HttpClient(manejador), AyudasDeCorreo.Opciones, reloj, log);

    private static bool EsPeticionDeToken(HttpRequestMessage p) => p.RequestUri!.AbsoluteUri == AyudasDeCorreo.Opciones.UrlDeToken;

    [Fact]
    public async Task Pide_el_access_token_con_el_refresh_token_y_envia_el_mensaje()
    {
        var manejador = new ManejadorHttpFalso((p, _) => EsPeticionDeToken(p) ? TokenValido() : Json(HttpStatusCode.OK, """{"id":"1"}"""));

        await Crear(manejador).Enviar(AyudasDeCorreo.Mensaje, CancellationToken.None);

        Assert.Equal(2, manejador.Peticiones.Count);

        var peticionDeToken = manejador.Peticiones[0].Cuerpo;
        Assert.Contains("grant_type=refresh_token", peticionDeToken, StringComparison.Ordinal);
        Assert.Contains("refresh_token=refresh-token-secreto", peticionDeToken, StringComparison.Ordinal);
        Assert.Contains("client_id=id-del-cliente", peticionDeToken, StringComparison.Ordinal);

        var envio = manejador.Peticiones[1];
        Assert.Equal(AyudasDeCorreo.Opciones.UrlDeEnvio, envio.Url.AbsoluteUri);
        Assert.Equal("Bearer acceso-1", envio.Autorizacion);

        var raw = JsonDocument.Parse(envio.Cuerpo).RootElement.GetProperty("raw").GetString()!;
        var mime = AyudasDeCorreo.DecodificarRaw(raw);
        Assert.Contains("To: ana@correo.com", mime, StringComparison.Ordinal);
        Assert.Contains("From: treeve@gmail.com", mime, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Reutiliza_el_access_token_mientras_no_venza()
    {
        var manejador = new ManejadorHttpFalso((p, _) => EsPeticionDeToken(p) ? TokenValido() : Json(HttpStatusCode.OK, "{}"));
        var enviador = Crear(manejador);

        await enviador.Enviar(AyudasDeCorreo.Mensaje, CancellationToken.None);
        reloj.Avanzar(TimeSpan.FromMinutes(30));
        await enviador.Enviar(AyudasDeCorreo.Mensaje, CancellationToken.None);

        var pedidosDeToken = manejador.Peticiones.Count(p => p.Url.AbsoluteUri == AyudasDeCorreo.Opciones.UrlDeToken);
        var envios = manejador.Peticiones.Count(p => p.Url.AbsoluteUri == AyudasDeCorreo.Opciones.UrlDeEnvio);
        Assert.Equal(1, pedidosDeToken);
        Assert.Equal(2, envios);
    }

    [Fact]
    public async Task Pide_otro_access_token_cuando_esta_por_vencer()
    {
        var manejador = new ManejadorHttpFalso((p, _) => EsPeticionDeToken(p) ? TokenValido() : Json(HttpStatusCode.OK, "{}"));
        var enviador = Crear(manejador);

        await enviador.Enviar(AyudasDeCorreo.Mensaje, CancellationToken.None);
        reloj.Avanzar(TimeSpan.FromSeconds(3600 - 30)); // dentro del margen de 60 s antes de vencer
        await enviador.Enviar(AyudasDeCorreo.Mensaje, CancellationToken.None);

        Assert.Equal(2, manejador.Peticiones.Count(p => p.Url.AbsoluteUri == AyudasDeCorreo.Opciones.UrlDeToken));
    }

    [Fact]
    public async Task Si_Gmail_responde_401_renueva_el_token_y_reintenta_una_vez()
    {
        var envios = 0;
        var manejador = new ManejadorHttpFalso((p, _) =>
        {
            if (EsPeticionDeToken(p))
            {
                return TokenValido();
            }

            envios++;
            return envios == 1 ? Json(HttpStatusCode.Unauthorized, """{"error":{"status":"UNAUTHENTICATED"}}""") : Json(HttpStatusCode.OK, "{}");
        });

        await Crear(manejador).Enviar(AyudasDeCorreo.Mensaje, CancellationToken.None);

        Assert.Equal(2, envios);
        Assert.Equal(2, manejador.Peticiones.Count(p => p.Url.AbsoluteUri == AyudasDeCorreo.Opciones.UrlDeToken));
    }

    [Fact]
    public async Task Un_401_que_se_repite_termina_en_error_sin_reintentar_mas()
    {
        var manejador = new ManejadorHttpFalso((p, _) =>
            EsPeticionDeToken(p) ? TokenValido() : Json(HttpStatusCode.Unauthorized, "{}"));

        await Assert.ThrowsAsync<ErrorDeEnvioDeCorreo>(() => Crear(manejador).Enviar(AyudasDeCorreo.Mensaje, CancellationToken.None));

        Assert.Equal(2, manejador.Peticiones.Count(p => p.Url.AbsoluteUri == AyudasDeCorreo.Opciones.UrlDeEnvio));
    }

    [Fact]
    public async Task Un_refresh_token_vencido_da_error_y_queda_el_codigo_de_Google_en_el_log()
    {
        var manejador = new ManejadorHttpFalso((_, _) => Json(HttpStatusCode.BadRequest, """{"error":"invalid_grant","error_description":"Token has been expired or revoked."}"""));

        await Assert.ThrowsAsync<ErrorDeEnvioDeCorreo>(() => Crear(manejador).Enviar(AyudasDeCorreo.Mensaje, CancellationToken.None));

        Assert.Contains(log.Lineas, l => l.Nivel == LogLevel.Error && l.Mensaje.Contains("invalid_grant", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Un_error_de_Gmail_se_convierte_en_error_de_envio()
    {
        var manejador = new ManejadorHttpFalso((p, _) =>
            EsPeticionDeToken(p) ? TokenValido() : Json(HttpStatusCode.InternalServerError, """{"error":{"status":"INTERNAL"}}"""));

        await Assert.ThrowsAsync<ErrorDeEnvioDeCorreo>(() => Crear(manejador).Enviar(AyudasDeCorreo.Mensaje, CancellationToken.None));

        Assert.Contains(log.Lineas, l => l.Mensaje.Contains("500", StringComparison.Ordinal) && l.Mensaje.Contains("INTERNAL", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Una_falla_de_red_se_convierte_en_error_de_envio()
    {
        var manejador = new ManejadorHttpFalso((_, _) => throw new HttpRequestException("sin conexión"));

        await Assert.ThrowsAsync<ErrorDeEnvioDeCorreo>(() => Crear(manejador).Enviar(AyudasDeCorreo.Mensaje, CancellationToken.None));
    }

    [Fact]
    public async Task El_log_no_incluye_el_destinatario_el_enlace_ni_los_secretos()
    {
        var manejador = new ManejadorHttpFalso((p, _) =>
            EsPeticionDeToken(p) ? TokenValido() : Json(HttpStatusCode.BadRequest, """{"error":{"status":"INVALID_ARGUMENT","message":"Invalid To header ana@correo.com"}}"""));

        await Assert.ThrowsAsync<ErrorDeEnvioDeCorreo>(() => Crear(manejador).Enviar(AyudasDeCorreo.Mensaje, CancellationToken.None));

        var todo = string.Join(" ", log.Lineas.Select(l => l.Mensaje));
        Assert.NotEmpty(todo);
        Assert.DoesNotContain("ana@correo.com", todo, StringComparison.Ordinal);
        Assert.DoesNotContain("token=abc", todo, StringComparison.Ordinal);
        Assert.DoesNotContain("refresh-token-secreto", todo, StringComparison.Ordinal);
        Assert.DoesNotContain("secreto-del-cliente", todo, StringComparison.Ordinal);
        Assert.DoesNotContain("acceso-1", todo, StringComparison.Ordinal);
    }

    [Fact]
    public void Las_opciones_no_imprimen_los_secretos()
    {
        var texto = AyudasDeCorreo.Opciones.ToString();

        Assert.DoesNotContain("refresh-token-secreto", texto, StringComparison.Ordinal);
        Assert.DoesNotContain("secreto-del-cliente", texto, StringComparison.Ordinal);
    }

    [Fact]
    public async Task El_envio_no_configurado_falla_con_error_de_envio_y_lo_deja_en_el_log()
    {
        var logNoConfigurado = new LogDePrueba<EnviadorDeCorreoNoConfigurado>();

        await Assert.ThrowsAsync<ErrorDeEnvioDeCorreo>(
            () => new EnviadorDeCorreoNoConfigurado(logNoConfigurado).Enviar(AyudasDeCorreo.Mensaje, CancellationToken.None));

        Assert.Contains(logNoConfigurado.Lineas, l => l.Nivel == LogLevel.Warning);
    }
}
