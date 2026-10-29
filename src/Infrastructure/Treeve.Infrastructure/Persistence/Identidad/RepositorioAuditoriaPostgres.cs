using Microsoft.EntityFrameworkCore;
using Treeve.Domain.Identidad;
using Treeve.Domain.Services.Identidad;

namespace Treeve.Infrastructure.Persistence.Identidad;

internal sealed class RepositorioAuditoriaPostgres(TreeveDbContext contexto) : IRepositorioAuditoria
{
    public async Task Registrar(AccesoNoAutorizado acceso, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(acceso);

        contexto.Set<AccesoNoAutorizado>().Add(acceso);
        await contexto.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<AccesoDenegadoConNombre>> Listar(int limite, int desplazamiento, CancellationToken ct) =>
        await contexto.Set<AccesoNoAutorizado>().AsNoTracking()
            .OrderByDescending(a => a.OcurrioEn)
            .ThenByDescending(a => a.Id)
            .Skip(desplazamiento)
            .Take(limite)
            .Select(a => new AccesoDenegadoConNombre(
                a.Id,
                a.UsuarioId,
                contexto.Set<Usuario>().Where(u => u.Id == a.UsuarioId).Select(u => u.NombreDeUsuario).FirstOrDefault(),
                a.OcurrioEn,
                a.Ip,
                a.Recurso,
                a.RolRequerido))
            .ToListAsync(ct);
}
