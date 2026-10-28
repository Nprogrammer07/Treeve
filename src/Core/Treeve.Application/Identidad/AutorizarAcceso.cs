using Treeve.Application.Comun;
using Treeve.Domain.Identidad;
using Treeve.Domain.Services.Identidad;

namespace Treeve.Application.Identidad;

/// <summary>Desde dónde y hacia qué ruta se pide el acceso. Lo arma la capa HTTP; el núcleo no conoce HTTP.</summary>
public sealed record ContextoDeAcceso(string? Ip, string Recurso)
{
    // La IP identifica a una persona: no se imprime.
    public override string ToString() => $"ContextoDeAcceso {{ Recurso = {Recurso} }}";
}

/// <summary>
/// HU-10 (RNF de seguridad): decide, en el backend y en cada petición, si una persona puede entrar a una ruta
/// de staff o de administración. El rol se lee de la base de datos en cada llamada, no del token: si se revoca
/// el rol (HU-12), el cambio vale desde la siguiente petición. Los intentos sin permiso quedan registrados con
/// usuario, fecha/hora e IP.
/// </summary>
public sealed class AutorizarAcceso(IRepositorioUsuarios usuarios, IRepositorioAuditoria auditoria, IReloj reloj)
{
    /// <summary>Devuelve el rol de la persona si alcanza <paramref name="requerido"/>; si no, deja constancia y niega.</summary>
    public async Task<Rol> Ejecutar(Guid usuarioId, Rol requerido, ContextoDeAcceso contexto, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(contexto);

        if (!Enum.IsDefined(requerido))
        {
            throw new ArgumentOutOfRangeException(nameof(requerido));
        }

        var usuario = await usuarios.ObtenerPorId(usuarioId, ct);

        if (usuario is not null && usuario.Rol.Cumple(requerido))
        {
            return usuario.Rol;
        }

        // Una persona que no existe (sesión de un usuario borrado) se niega igual y también queda registrada.
        // Si no se puede escribir el registro, la excepción corta la petición: ante la duda, no se entra.
        await auditoria.Registrar(
            AccesoNoAutorizado.Registrar(usuarioId, contexto.Ip, contexto.Recurso, requerido, reloj.Ahora), ct);

        throw new AccesoDenegado();
    }
}
