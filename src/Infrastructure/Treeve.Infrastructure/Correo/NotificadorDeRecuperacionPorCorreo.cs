using System.Globalization;
using System.Net;
using Treeve.Application.Identidad;

namespace Treeve.Infrastructure.Correo;

/// <summary>
/// HU-03b: arma el correo con el enlace de restablecimiento (a la pantalla del frontend, con el token como
/// parámetro <c>token</c>) y lo manda por el transporte configurado.
/// </summary>
internal sealed class NotificadorDeRecuperacionPorCorreo(IEnviadorDeCorreo enviador, Uri urlBase) : INotificadorDeRecuperacion
{
    private static readonly TimeSpan HusoDeColombia = TimeSpan.FromHours(-5);

    public Task Enviar(string correo, string apodo, string token, DateTimeOffset expiraEn, CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(correo);
        ArgumentNullException.ThrowIfNull(apodo);
        ArgumentException.ThrowIfNullOrWhiteSpace(token);

        var enlace = ConstruirEnlace(urlBase, token);
        var vence = expiraEn.ToOffset(HusoDeColombia).ToString("h:mm tt", CultureInfo.GetCultureInfo("es-CO"));
        var saludo = apodo.Length == 0 ? "Hola" : $"Hola, {apodo}";

        var texto = $"""
            {saludo}.

            Recibimos una solicitud para restablecer tu contraseña de Treeve. Abre este enlace para elegir una nueva (sirve una sola vez y vence a las {vence}, hora de Colombia):

            {enlace}

            Si no fuiste tú, ignora este correo: tu contraseña sigue igual.
            """;

        var html = $"""
            <p>{WebUtility.HtmlEncode(saludo)}.</p>
            <p>Recibimos una solicitud para restablecer tu contraseña de Treeve. Usa el botón para elegir una nueva (sirve una sola vez y vence a las {WebUtility.HtmlEncode(vence)}, hora de Colombia).</p>
            <p><a href="{WebUtility.HtmlEncode(enlace)}" style="display:inline-block;padding:10px 18px;background:#2f7d4f;color:#ffffff;text-decoration:none;border-radius:6px">Restablecer contraseña</a></p>
            <p>Si el botón no funciona, copia esta dirección en tu navegador:<br>{WebUtility.HtmlEncode(enlace)}</p>
            <p>Si no fuiste tú, ignora este correo: tu contraseña sigue igual.</p>
            """;

        return enviador.Enviar(new MensajeDeCorreo(correo, "Restablece tu contraseña de Treeve", texto, html), ct);
    }

    /// <summary>Suma <c>token</c> a la dirección base, respetando los parámetros que ya tuviera.</summary>
    internal static string ConstruirEnlace(Uri urlBase, string token)
    {
        var constructor = new UriBuilder(urlBase);
        var parametro = "token=" + Uri.EscapeDataString(token);

        constructor.Query = string.IsNullOrEmpty(constructor.Query)
            ? parametro
            : constructor.Query.TrimStart('?') + "&" + parametro;

        return constructor.Uri.AbsoluteUri;
    }
}
