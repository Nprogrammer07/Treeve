using Treeve.Application.Sugerencias;
using Treeve.Domain.Services.Sugerencias;
using Treeve.Domain.Sugerencias;

namespace Treeve.Application.Tests.Sugerencias;

public class ListarMisSugerenciasTests
{
    private static readonly DateTimeOffset Inicio = new(2026, 10, 26, 15, 0, 0, TimeSpan.FromHours(-5));

    private readonly RepositorioSugerenciasFalso repositorio = new();
    private readonly ListarMisSugerencias listar;

    public ListarMisSugerenciasTests()
    {
        listar = new ListarMisSugerencias(repositorio);
    }

    private void Guardar(Guid usuarioId, string texto, int minutos) =>
        repositorio.Guardadas.Add(Sugerencia.Enviar(usuarioId, TextoSugerencia.Crear(texto), Inicio.AddMinutes(minutos)));

    [Fact]
    public async Task Devuelve_solo_las_de_la_persona_de_la_mas_reciente_a_la_mas_antigua()
    {
        var yo = Guid.NewGuid();
        Guardar(yo, "Primera", 0);
        Guardar(Guid.NewGuid(), "De otra persona", 1);
        Guardar(yo, "Segunda", 2);

        var historial = await listar.Ejecutar(yo, CancellationToken.None);

        Assert.Equal(2, historial.Count);
        Assert.Equal("Segunda", historial[0].Texto);
        Assert.Equal("Primera", historial[1].Texto);
        Assert.All(historial, s => Assert.Equal(EstadoSugerencia.Pendiente, s.Estado));
    }

    [Fact]
    public async Task Sin_sugerencias_el_historial_esta_vacio()
    {
        Guardar(Guid.NewGuid(), "De otra persona", 0);

        Assert.Empty(await listar.Ejecutar(Guid.NewGuid(), CancellationToken.None));
    }

    [Fact]
    public async Task El_historial_tiene_un_tope()
    {
        var yo = Guid.NewGuid();
        for (var i = 0; i < ListarMisSugerencias.MaximoEnHistorial + 5; i++)
        {
            Guardar(yo, $"Idea {i}", i);
        }

        Assert.Equal(ListarMisSugerencias.MaximoEnHistorial, (await listar.Ejecutar(yo, CancellationToken.None)).Count);
    }

    [Fact]
    public async Task No_muestra_las_de_otra_persona_aunque_el_repositorio_las_devolviera()
    {
        var yo = Guid.NewGuid();
        var otra = Guid.NewGuid();
        Guardar(otra, "Ajena", 0);

        var conRepositorioDescuidado = new ListarMisSugerencias(new RepositorioQueDevuelveTodo(repositorio));

        Assert.Empty(await conRepositorioDescuidado.Ejecutar(yo, CancellationToken.None));
    }

    private sealed class RepositorioQueDevuelveTodo(RepositorioSugerenciasFalso interno) : IRepositorioSugerencias
    {
        public Task Agregar(Sugerencia sugerencia, CancellationToken ct) => interno.Agregar(sugerencia, ct);

        public Task<IReadOnlyList<Sugerencia>> ListarDeUsuario(Guid usuarioId, int limite, CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<Sugerencia>>([.. interno.Guardadas]);

        public Task<IReadOnlyList<SugerenciaConAutor>> Buscar(FiltroDeSugerencias filtro, CancellationToken ct) =>
            interno.Buscar(filtro, ct);
    }
}
