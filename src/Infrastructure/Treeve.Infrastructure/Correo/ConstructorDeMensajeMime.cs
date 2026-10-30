using System.Text;

namespace Treeve.Infrastructure.Correo;

/// <summary>
/// Arma el mensaje RFC 5322 que pide la API de Gmail (el campo <c>raw</c>, en Base64 URL-safe): encabezados
/// codificados para admitir tildes y un cuerpo con versión de texto y versión HTML.
/// </summary>
internal static class ConstructorDeMensajeMime
{
    public static string Construir(string remitente, MensajeDeCorreo mensaje)
    {
        ArgumentNullException.ThrowIfNull(mensaje);

        // Un salto de línea en un encabezado permitiría inyectar otros (copias ocultas, por ejemplo).
        SinSaltosDeLinea(remitente, nameof(remitente));
        SinSaltosDeLinea(mensaje.Para, nameof(mensaje));
        SinSaltosDeLinea(mensaje.Asunto, nameof(mensaje));

        var limite = "treeve-" + Guid.NewGuid().ToString("N");
        var texto = new StringBuilder();

        texto.Append("From: ").Append(remitente).Append("\r\n");
        texto.Append("To: ").Append(mensaje.Para).Append("\r\n");
        texto.Append("Subject: ").Append(CodificarEncabezado(mensaje.Asunto)).Append("\r\n");
        texto.Append("MIME-Version: 1.0\r\n");
        texto.Append("Content-Type: multipart/alternative; boundary=\"").Append(limite).Append("\"\r\n\r\n");

        AgregarParte(texto, limite, "text/plain", mensaje.Texto);
        AgregarParte(texto, limite, "text/html", mensaje.Html);
        texto.Append("--").Append(limite).Append("--\r\n");

        return Base64Url(Encoding.UTF8.GetBytes(texto.ToString()));
    }

    internal static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static void AgregarParte(StringBuilder texto, string limite, string tipo, string contenido)
    {
        texto.Append("--").Append(limite).Append("\r\n");
        texto.Append("Content-Type: ").Append(tipo).Append("; charset=\"UTF-8\"\r\n");
        texto.Append("Content-Transfer-Encoding: base64\r\n\r\n");

        // Base64 en líneas de 76 caracteres, como exige MIME.
        var base64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(contenido));
        for (var i = 0; i < base64.Length; i += 76)
        {
            texto.Append(base64, i, Math.Min(76, base64.Length - i)).Append("\r\n");
        }

        texto.Append("\r\n");
    }

    private static string CodificarEncabezado(string valor) =>
        valor.All(c => c is >= ' ' and <= '~')
            ? valor
            : "=?UTF-8?B?" + Convert.ToBase64String(Encoding.UTF8.GetBytes(valor)) + "?=";

    private static void SinSaltosDeLinea(string valor, string nombre)
    {
        if (valor.Contains('\r', StringComparison.Ordinal) || valor.Contains('\n', StringComparison.Ordinal))
        {
            throw new ArgumentException("El encabezado no puede tener saltos de línea.", nombre);
        }
    }
}
