using Treeve.Application.Comun;
using Treeve.Domain.Services.Identidad;

namespace Treeve.Application.Identidad;

/// <summary>Dado el token que envía el cliente, devuelve el usuario dueño de la sesión o null si no es válida.</summary>
public sealed class ValidarSesion(IRepositorioSesiones sesiones, IEmisorDeTokens tokens, IReloj reloj)
{
    public async Task<Guid?> Ejecutar(string? token, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return null;
        }

        var sesion = await sesiones.ObtenerVigentePorTokenHash(tokens.HashDe(token), reloj.Ahora, ct);
        return sesion?.UsuarioId;
    }
}
