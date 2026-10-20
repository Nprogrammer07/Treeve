using Treeve.Api.Errores;

namespace Treeve.Api.Seguridad;

public static class ExigirHttps
{
    /// <summary>
    /// RNF de seguridad de HU-02: las peticiones de /api solo se aceptan por HTTPS. Detrás del proxy de la
    /// plataforma, "HTTPS" se sabe por X-Forwarded-Proto (ver UseForwardedHeaders en Program.cs).
    /// /health queda fuera para que los chequeos internos de la plataforma sigan funcionando.
    /// </summary>
    public static IApplicationBuilder ExigirHttpsEnLaApi(this IApplicationBuilder app)
    {
        ArgumentNullException.ThrowIfNull(app);

        return app.Use(async (contexto, siguiente) =>
        {
            if (contexto.Request.Path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase) && !contexto.Request.IsHttps)
            {
                contexto.Response.StatusCode = StatusCodes.Status400BadRequest;
                await contexto.Response.WriteAsJsonAsync(
                    new ErrorResponse("HTTPS_REQUERIDO", "Esta API solo acepta conexiones HTTPS."));
                return;
            }

            await siguiente(contexto);
        });
    }
}
