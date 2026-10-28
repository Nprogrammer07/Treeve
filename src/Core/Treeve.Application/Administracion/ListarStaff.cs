using Treeve.Application.Identidad;
using Treeve.Domain.Identidad;
using Treeve.Domain.Services.Identidad;

namespace Treeve.Application.Administracion;

/// <summary>Una persona del staff tal como la ve un administrador: sin nombre completo, sin correo y sin nada de sus desahogos.</summary>
public sealed record MiembroDelStaff(Guid UsuarioId, string NombreDeUsuario, string Apodo, Rol Rol);

/// <summary>HU-12: el administrador ve quién tiene rol de staff o de administración.</summary>
public sealed class ListarStaff(AutorizarAcceso autorizar, IRepositorioUsuarios usuarios)
{
    public async Task<IReadOnlyList<MiembroDelStaff>> Ejecutar(Guid administradorId, ContextoDeAcceso contexto, CancellationToken ct)
    {
        await autorizar.Ejecutar(administradorId, Rol.Administrador, contexto, ct);

        var staff = await usuarios.ListarStaff(ct);

        return [.. staff.Select(u => new MiembroDelStaff(u.Id, u.NombreDeUsuario, u.Apodo, u.Rol))];
    }
}
