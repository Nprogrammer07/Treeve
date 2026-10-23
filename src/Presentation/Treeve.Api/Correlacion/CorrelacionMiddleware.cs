using System.Text.RegularExpressions;

namespace Treeve.Api.Correlacion;

/// <summary>
/// TEC-03: cada petición lleva un id de correlación. Si el cliente manda <c>X-Correlation-Id</c> (y es un valor
/// sencillo) se respeta; si no, se genera uno. Sale en la respuesta y en todas las líneas del log de la petición
/// (también en las del bus de eventos), para seguir una acción de punta a punta sin registrar datos de la persona.
/// </summary>
public static partial class CorrelacionMiddleware
{
    public const string Cabecera = "X-Correlation-Id";

    public static IApplicationBuilder UsarIdDeCorrelacion(this IApplicationBuilder app)
    {
        ArgumentNullException.ThrowIfNull(app);

        return app.Use(async (contexto, siguiente) =>
        {
            var id = IdValido(contexto.Request.Headers[Cabecera].ToString()) ?? Guid.NewGuid().ToString("N");

            contexto.TraceIdentifier = id;
            contexto.Response.Headers[Cabecera] = id;

            var log = contexto.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("Treeve.Correlacion");
            using (log.BeginScope("CorrelacionId:{CorrelacionId}", id))
            {
                await siguiente(contexto);
            }
        });
    }

    /// <summary>Solo letras, números, punto, guion y guion bajo, hasta 64: así el valor no puede falsear líneas del log.</summary>
    internal static string? IdValido(string? valor) =>
        valor is not null && FormaValida().IsMatch(valor) ? valor : null;

    [GeneratedRegex("^[A-Za-z0-9._-]{1,64}$")]
    private static partial Regex FormaValida();
}
