using Treeve.Application.Identidad;

namespace Treeve.Api.Autenticacion;

public static class ContextoDeAccesoExtensions
{
    /// <summary>
    /// Desde dónde y hacia qué ruta llega la petición, para la auditoría de accesos (HU-10). La ruta no lleva la consulta
    /// (puede traer datos) y la IP ya viene corregida por los encabezados X-Forwarded-* del proxy (ver Program.cs).
    /// </summary>
    public static ContextoDeAcceso ObtenerContextoDeAcceso(this HttpContext http)
    {
        ArgumentNullException.ThrowIfNull(http);

        var ip = http.Connection.RemoteIpAddress;
        var texto = ip is null ? null : (ip.IsIPv4MappedToIPv6 ? ip.MapToIPv4() : ip).ToString();

        return new ContextoDeAcceso(texto, $"{http.Request.Method} {http.Request.Path}");
    }
}
