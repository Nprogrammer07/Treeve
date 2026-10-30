using Treeve.Domain.Services.Sugerencias;
using Treeve.Domain.Sugerencias;

namespace Treeve.Application.Tests.Sugerencias;

internal sealed class RepositorioSugerenciasFalso : IRepositorioSugerencias
{
    public List<Sugerencia> Guardadas { get; } = [];

    /// <summary>Lo que devolverá <see cref="Buscar"/>, y el último filtro que recibió.</summary>
    public List<SugerenciaConAutor> Resultado { get; } = [];

    public FiltroDeSugerencias? UltimoFiltro { get; private set; }

    /// <summary>Cuántas veces se llamó a <see cref="Guardar"/> (HU-11).</summary>
    public int VecesGuardada { get; private set; }

    public Task Agregar(Sugerencia sugerencia, CancellationToken ct)
    {
        Guardadas.Add(sugerencia);
        return Task.CompletedTask;
    }

    public Task<Sugerencia?> ObtenerPorId(Guid sugerenciaId, CancellationToken ct) =>
        Task.FromResult(Guardadas.SingleOrDefault(s => s.Id == sugerenciaId));

    public Task Guardar(Sugerencia sugerencia, CancellationToken ct)
    {
        VecesGuardada++;
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<Sugerencia>> ListarDeUsuario(Guid usuarioId, int limite, CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<Sugerencia>>(
            [.. Guardadas.Where(s => s.UsuarioId == usuarioId).OrderByDescending(s => s.CreadaEn).Take(limite)]);

    public Task<IReadOnlyList<SugerenciaConAutor>> Buscar(FiltroDeSugerencias filtro, CancellationToken ct)
    {
        UltimoFiltro = filtro;
        return Task.FromResult<IReadOnlyList<SugerenciaConAutor>>([.. Resultado.Skip(filtro.Desplazamiento).Take(filtro.Limite)]);
    }
}
