using Microsoft.EntityFrameworkCore;
using Treeve.Domain.Identidad;
using Treeve.Domain.Services.Identidad;

namespace Treeve.Infrastructure.Persistence.Identidad;

internal sealed class RepositorioCredencialesPostgres(TreeveDbContext contexto) : IRepositorioCredenciales
{
    public Task<Credencial?> ObtenerPorIdentificador(string identificadorNormalizado, CancellationToken ct) =>
        contexto.Set<Credencial>().FirstOrDefaultAsync(
            c => contexto.Set<Usuario>().Any(u => u.Id == c.UsuarioId &&
                (u.NombreDeUsuario == identificadorNormalizado || u.Correo == identificadorNormalizado)),
            ct);

    public Task<Credencial?> ObtenerPorUsuarioId(Guid usuarioId, CancellationToken ct) =>
        contexto.Set<Credencial>().FirstOrDefaultAsync(c => c.UsuarioId == usuarioId, ct);

    public Task Actualizar(Credencial credencial, CancellationToken ct) => contexto.SaveChangesAsync(ct);
}
