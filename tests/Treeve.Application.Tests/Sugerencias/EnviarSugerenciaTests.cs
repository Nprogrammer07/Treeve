using Treeve.Application.Sugerencias;
using Treeve.Domain.Comun;
using Treeve.Domain.Sugerencias;

namespace Treeve.Application.Tests.Sugerencias;

public class EnviarSugerenciaTests
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 26, 15, 0, 0, TimeSpan.FromHours(-5));

    private readonly RepositorioSugerenciasFalso repositorio = new();
    private readonly EnviarSugerencia enviar;

    public EnviarSugerenciaTests()
    {
        enviar = new EnviarSugerencia(repositorio, new Identidad.RelojManual(Ahora));
    }

    [Fact]
    public async Task Guarda_la_sugerencia_pendiente_de_la_persona_con_sesion()
    {
        var usuarioId = Guid.NewGuid();

        var enviada = await enviar.Ejecutar(usuarioId, new EnviarSugerenciaComando("Quiero un modo oscuro"), CancellationToken.None);

        var guardada = Assert.Single(repositorio.Guardadas);
        Assert.Equal(usuarioId, guardada.UsuarioId);
        Assert.Equal("Quiero un modo oscuro", guardada.Texto);
        Assert.Equal(EstadoSugerencia.Pendiente, guardada.Estado);
        Assert.Equal(Ahora, guardada.CreadaEn);
        Assert.Equal(guardada.Id, enviada.SugerenciaId);
        Assert.Equal(Ahora, enviada.CreadaEn);
        Assert.Equal(EstadoSugerencia.Pendiente, enviada.Estado);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("   ")]
    public async Task Una_sugerencia_vacia_no_se_guarda(string? texto)
    {
        await Assert.ThrowsAsync<ExcepcionDeDominio>(
            () => enviar.Ejecutar(Guid.NewGuid(), new EnviarSugerenciaComando(texto), CancellationToken.None));

        Assert.Empty(repositorio.Guardadas);
    }

    [Fact]
    public async Task Una_sugerencia_demasiado_larga_no_se_guarda()
    {
        await Assert.ThrowsAsync<ExcepcionDeDominio>(
            () => enviar.Ejecutar(
                Guid.NewGuid(),
                new EnviarSugerenciaComando(new string('a', TextoSugerencia.LongitudMaxima + 1)),
                CancellationToken.None));

        Assert.Empty(repositorio.Guardadas);
    }

    [Fact]
    public async Task Se_puede_enviar_mas_de_una_y_cada_una_tiene_su_id()
    {
        var usuarioId = Guid.NewGuid();

        var primera = await enviar.Ejecutar(usuarioId, new EnviarSugerenciaComando("Uno"), CancellationToken.None);
        var segunda = await enviar.Ejecutar(usuarioId, new EnviarSugerenciaComando("Dos"), CancellationToken.None);

        Assert.NotEqual(primera.SugerenciaId, segunda.SugerenciaId);
        Assert.Equal(2, repositorio.Guardadas.Count);
    }

    [Fact]
    public void El_comando_no_imprime_el_texto()
    {
        Assert.DoesNotContain("modo oscuro", new EnviarSugerenciaComando("modo oscuro").ToString(), StringComparison.Ordinal);
    }
}
