using Microsoft.AspNetCore.Diagnostics;
using Treeve.Application.Comun;
using Treeve.Domain.Comun;

namespace Treeve.Api.Errores;

/// <summary>Traduce las excepciones del núcleo a respuestas HTTP. Lo demás se responde como 500 sin detalles.</summary>
public sealed class ManejadorDeExcepciones : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(httpContext);

        var (estado, error) = exception switch
        {
            ExcepcionDeDominio e => (StatusCodes.Status400BadRequest, new ErrorResponse("VALIDACION", e.Message)),
            AccesoDenegado e => (StatusCodes.Status403Forbidden, new ErrorResponse("ACCESO_DENEGADO", e.Message)),
            _ => (0, null),
        };

        if (error is null)
        {
            return false;
        }

        httpContext.Response.StatusCode = estado;
        await httpContext.Response.WriteAsJsonAsync(error, cancellationToken);
        return true;
    }
}
