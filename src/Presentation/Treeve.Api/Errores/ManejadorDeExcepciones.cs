using Microsoft.AspNetCore.Diagnostics;
using Treeve.Application.Comun;
using Treeve.Application.Identidad;
using Treeve.Domain.Comun;

namespace Treeve.Api.Errores;

/// <summary>Traduce las excepciones del núcleo a respuestas HTTP. Lo demás se responde como 500 sin detalles.</summary>
public sealed class ManejadorDeExcepciones : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(httpContext);

        if (exception is CuentaBloqueada bloqueada)
        {
            var minutos = Math.Max(1, (int)Math.Ceiling(bloqueada.Restante.TotalMinutes));
            httpContext.Response.Headers.RetryAfter = ((int)Math.Ceiling(bloqueada.Restante.TotalSeconds)).ToString(System.Globalization.CultureInfo.InvariantCulture);
            await Responder(
                httpContext,
                StatusCodes.Status429TooManyRequests,
                new ErrorResponse("CUENTA_BLOQUEADA", $"Demasiados intentos fallidos. Intenta de nuevo en {minutos} minuto(s)."),
                cancellationToken);
            return true;
        }

        var (estado, error) = exception switch
        {
            CredencialesInvalidas e => (StatusCodes.Status401Unauthorized, new ErrorResponse("CREDENCIALES_INVALIDAS", e.Message)),
            ExcepcionDeDominio e => (StatusCodes.Status400BadRequest, new ErrorResponse("VALIDACION", e.Message)),
            AccesoDenegado e => (StatusCodes.Status403Forbidden, new ErrorResponse("ACCESO_DENEGADO", e.Message)),
            _ => (0, null),
        };

        if (error is null)
        {
            return false;
        }

        await Responder(httpContext, estado, error, cancellationToken);
        return true;
    }

    private static async Task Responder(HttpContext httpContext, int estado, ErrorResponse error, CancellationToken ct)
    {
        httpContext.Response.StatusCode = estado;
        await httpContext.Response.WriteAsJsonAsync(error, ct);
    }
}
