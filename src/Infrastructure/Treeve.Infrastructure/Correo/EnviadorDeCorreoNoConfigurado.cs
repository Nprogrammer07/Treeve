using Microsoft.Extensions.Logging;
using Treeve.Application.Identidad;

namespace Treeve.Infrastructure.Correo;

/// <summary>
/// Se usa cuando no hay credenciales de Gmail (un computador de desarrollo, por ejemplo). La API arranca igual; la
/// persona que pide recuperar su contraseña ve la misma respuesta de siempre, y el motivo queda en el log.
/// </summary>
internal sealed class EnviadorDeCorreoNoConfigurado(ILogger<EnviadorDeCorreoNoConfigurado> log) : IEnviadorDeCorreo
{
    public Task Enviar(MensajeDeCorreo mensaje, CancellationToken ct)
    {
        log.LogWarning(
            "El correo no está configurado: no se envió nada. Define Correo__Gmail__ClientId, __ClientSecret, __RefreshToken y __Remitente.");

        throw new ErrorDeEnvioDeCorreo("El correo no está configurado.");
    }
}
