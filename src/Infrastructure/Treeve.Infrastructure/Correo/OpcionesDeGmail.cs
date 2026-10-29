namespace Treeve.Infrastructure.Correo;

/// <summary>
/// Credenciales OAuth2 de la cuenta de Gmail que envía los correos (ADR-008). Llegan por variables de entorno:
/// <c>Correo__Gmail__ClientId</c>, <c>Correo__Gmail__ClientSecret</c>, <c>Correo__Gmail__RefreshToken</c> y
/// <c>Correo__Gmail__Remitente</c>. Son secretos: no se imprimen ni se guardan en el repositorio.
/// </summary>
internal sealed record OpcionesDeGmail(string ClientId, string ClientSecret, string RefreshToken, string Remitente)
{
    public const string UrlDeTokenPorDefecto = "https://oauth2.googleapis.com/token";
    public const string UrlDeEnvioPorDefecto = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

    public string UrlDeToken { get; init; } = UrlDeTokenPorDefecto;
    public string UrlDeEnvio { get; init; } = UrlDeEnvioPorDefecto;

    public override string ToString() => "[opciones de Gmail]";
}
