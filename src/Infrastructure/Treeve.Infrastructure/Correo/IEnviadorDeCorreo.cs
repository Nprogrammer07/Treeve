namespace Treeve.Infrastructure.Correo;

/// <summary>Un correo con su versión en texto plano y en HTML. El destinatario ya viene validado.</summary>
internal sealed record MensajeDeCorreo(string Para, string Asunto, string Texto, string Html)
{
    // El texto lleva el enlace de recuperación: nunca se imprime.
    public override string ToString() => "[mensaje de correo]";
}

/// <summary>Transporte de correo saliente (ADR-008). La implementación real usa la API de Gmail.</summary>
internal interface IEnviadorDeCorreo
{
    /// <exception cref="Treeve.Application.Identidad.ErrorDeEnvioDeCorreo">El correo no salió.</exception>
    Task Enviar(MensajeDeCorreo mensaje, CancellationToken ct);
}
