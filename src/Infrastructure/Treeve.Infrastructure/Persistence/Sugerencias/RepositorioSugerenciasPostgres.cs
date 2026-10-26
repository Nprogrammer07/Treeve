using Microsoft.EntityFrameworkCore;
using Treeve.Domain.Identidad;
using Treeve.Domain.Services.Sugerencias;
using Treeve.Domain.Sugerencias;

namespace Treeve.Infrastructure.Persistence.Sugerencias;

internal sealed class RepositorioSugerenciasPostgres(TreeveDbContext contexto) : IRepositorioSugerencias
{
    public async Task Agregar(Sugerencia sugerencia, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(sugerencia);

        contexto.Set<Sugerencia>().Add(sugerencia);
        await contexto.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<Sugerencia>> ListarDeUsuario(Guid usuarioId, int limite, CancellationToken ct) =>
        await contexto.Set<Sugerencia>().AsNoTracking()
            .Where(s => s.UsuarioId == usuarioId)
            .OrderByDescending(s => s.CreadaEn)
            .ThenByDescending(s => s.Id)
            .Take(limite)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<SugerenciaConAutor>> Buscar(FiltroDeSugerencias filtro, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(filtro);

        var consulta = contexto.Set<Sugerencia>().AsNoTracking()
            .Join(
                contexto.Set<Usuario>().AsNoTracking(),
                s => s.UsuarioId,
                u => u.Id,
                (s, u) => new { Sugerencia = s, u.NombreDeUsuario });

        // Los filtros se aplican antes de proyectar al tipo de respuesta, para que la base de datos los resuelva.
        if (filtro.Estado is { } estado)
        {
            consulta = consulta.Where(x => x.Sugerencia.Estado == estado);
        }

        if (filtro.Desde is { } desde)
        {
            consulta = consulta.Where(x => x.Sugerencia.CreadaEn >= desde);
        }

        if (filtro.Hasta is { } hasta)
        {
            consulta = consulta.Where(x => x.Sugerencia.CreadaEn < hasta);
        }

        if (filtro.NombreDeUsuario is { } nombre)
        {
            consulta = consulta.Where(x => x.NombreDeUsuario == nombre);
        }

        return await consulta
            .OrderByDescending(x => x.Sugerencia.CreadaEn)
            .ThenByDescending(x => x.Sugerencia.Id)
            .Skip(filtro.Desplazamiento)
            .Take(filtro.Limite)
            .Select(x => new SugerenciaConAutor(
                x.Sugerencia.Id,
                x.Sugerencia.UsuarioId,
                x.NombreDeUsuario,
                x.Sugerencia.Texto,
                x.Sugerencia.Estado,
                x.Sugerencia.CreadaEn))
            .ToListAsync(ct);
    }
}
