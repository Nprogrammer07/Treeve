using Microsoft.EntityFrameworkCore;
using Npgsql;
using Treeve.Domain.Comun;
using Treeve.Domain.Identidad;
using Treeve.Domain.Services.Identidad;

namespace Treeve.Infrastructure.Persistence.Identidad;

internal sealed class RepositorioUsuariosPostgres(TreeveDbContext contexto) : IRepositorioUsuarios
{
    public Task<bool> ExisteNombreDeUsuarioOCorreo(string nombreDeUsuario, string? correo, CancellationToken ct) =>
        contexto.Set<Usuario>().AnyAsync(
            u => u.NombreDeUsuario == nombreDeUsuario || (correo != null && u.Correo == correo), ct);

    public Task<Usuario?> ObtenerPorId(Guid usuarioId, CancellationToken ct) =>
        contexto.Set<Usuario>().FirstOrDefaultAsync(u => u.Id == usuarioId, ct);

    public Task<Usuario?> ObtenerPorNombreDeUsuario(string nombreDeUsuario, CancellationToken ct) =>
        contexto.Set<Usuario>().FirstOrDefaultAsync(u => u.NombreDeUsuario == nombreDeUsuario, ct);

    // El rol se guarda como texto: se compara por igualdad, no con >= (que compararía letras).
    public async Task<IReadOnlyList<PersonaDelStaff>> ListarStaff(CancellationToken ct) =>
        await contexto.Set<Usuario>().AsNoTracking()
            .Where(u => u.Rol == Rol.Staff || u.Rol == Rol.Administrador)
            .OrderBy(u => u.NombreDeUsuario)
            .Select(u => new PersonaDelStaff(u.Id, u.NombreDeUsuario, u.Apodo, u.Rol))
            .ToListAsync(ct);

    public Task<Usuario?> ObtenerPorCorreo(string correoNormalizado, CancellationToken ct) =>
        contexto.Set<Usuario>().FirstOrDefaultAsync(u => u.Correo == correoNormalizado, ct);

    public async Task Agregar(Usuario usuario, Credencial credencial, CancellationToken ct)
    {
        // Un solo SaveChanges: el perfil y la credencial se guardan juntos o no se guarda ninguno.
        contexto.Set<Usuario>().Add(usuario);
        contexto.Set<Credencial>().Add(credencial);

        try
        {
            await contexto.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            // Dos registros simultáneos con el mismo usuario o correo: lo frena el índice único.
            throw new ExcepcionDeDominio("El usuario o el correo ya están en uso.");
        }
    }
}
