using Microsoft.EntityFrameworkCore;
using Treeve.Domain.Administracion;
using Treeve.Domain.Identidad;
using Treeve.Domain.Services.Administracion;

namespace Treeve.Infrastructure.Persistence.Administracion;

internal sealed class RepositorioCambiosDeRolPostgres(TreeveDbContext contexto) : IRepositorioCambiosDeRol
{
    public async Task Registrar(CambioDeRol cambio, Usuario usuarioAfectado, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(cambio);
        ArgumentNullException.ThrowIfNull(usuarioAfectado);

        // Un solo SaveChanges: el rol nuevo y su registro de auditoría se guardan juntos o no se guarda ninguno.
        if (contexto.Entry(usuarioAfectado).State == EntityState.Detached)
        {
            contexto.Attach(usuarioAfectado);
        }

        contexto.Entry(usuarioAfectado).Property(u => u.Rol).IsModified = true;
        contexto.Set<CambioDeRol>().Add(cambio);

        await contexto.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<CambioDeRolConNombres>> Listar(int limite, int desplazamiento, CancellationToken ct) =>
        await contexto.Set<CambioDeRol>().AsNoTracking()
            .OrderByDescending(c => c.OcurrioEn)
            .ThenByDescending(c => c.Id)
            .Skip(desplazamiento)
            .Take(limite)
            .Select(c => new CambioDeRolConNombres(
                c.Id,
                c.AdministradorId,
                contexto.Set<Usuario>().Where(u => u.Id == c.AdministradorId).Select(u => u.NombreDeUsuario).FirstOrDefault(),
                c.UsuarioAfectadoId,
                contexto.Set<Usuario>().Where(u => u.Id == c.UsuarioAfectadoId).Select(u => u.NombreDeUsuario).FirstOrDefault(),
                c.RolAnterior,
                c.RolNuevo,
                c.OcurrioEn))
            .ToListAsync(ct);
}
