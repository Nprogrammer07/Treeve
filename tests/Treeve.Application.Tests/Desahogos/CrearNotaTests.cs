using System.Text;
using Treeve.Application.Desahogos;
using Treeve.Application.Tests.Identidad;
using Treeve.Domain.Comun;
using Treeve.Domain.Desahogos;

namespace Treeve.Application.Tests.Desahogos;

public class CrearNotaTests
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 23, 9, 30, 0, TimeSpan.FromHours(-5));

    private readonly RepositorioNotasFalso notas = new();
    private readonly PublicadorEventosFalso eventos = new();
    private readonly CifradorFalso cifrador = new();
    private readonly CrearNota crearNota;
    private readonly Guid usuarioId = Guid.NewGuid();

    public CrearNotaTests()
    {
        crearNota = new CrearNota(notas, cifrador, new RelojManual(Ahora), eventos);
    }

    [Fact]
    public async Task Guarda_el_desahogo_con_la_fecha_la_hora_y_la_emocion_elegida()
    {
        var guardada = await crearNota.Ejecutar(usuarioId, new CrearNotaComando(Emocion.Rabia, "Hoy me enojé mucho."), CancellationToken.None);

        var nota = Assert.Single(notas.Guardadas);
        Assert.Equal(guardada.NotaId, nota.Id);
        Assert.Equal(usuarioId, nota.UsuarioId);
        Assert.Equal(Emocion.Rabia, nota.Emocion);
        Assert.Equal(Ahora, nota.CreadaEn);
        Assert.Equal(Ahora, guardada.CreadaEn);
    }

    [Fact]
    public async Task El_texto_se_guarda_cifrado_nunca_en_claro()
    {
        await crearNota.Ejecutar(usuarioId, new CrearNotaComando(Emocion.Tristeza, "Extraño a mi abuela."), CancellationToken.None);

        var nota = Assert.Single(notas.Guardadas);
        Assert.DoesNotContain("abuela", Encoding.UTF8.GetString(nota.TextoCifrado), StringComparison.Ordinal);
        Assert.Equal("Extraño a mi abuela.", cifrador.Descifrar(nota.TextoCifrado, ContextoDeNotas.Para(nota.Id, usuarioId)));
    }

    [Fact]
    public async Task Publica_NotaCreada_con_solo_ids_y_metadatos()
    {
        var guardada = await crearNota.Ejecutar(usuarioId, new CrearNotaComando(Emocion.Miedo, "Mañana tengo examen."), CancellationToken.None);

        var evento = Assert.IsType<NotaCreada>(Assert.Single(eventos.Publicados));
        Assert.Equal(guardada.NotaId, evento.NotaId);
        Assert.Equal(usuarioId, evento.UsuarioId);
        Assert.Equal(Emocion.Miedo, evento.Emocion);
        Assert.Equal(Ahora, evento.Fecha);
        Assert.DoesNotContain("examen", evento.ToString(), StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("    ")]
    public async Task Un_desahogo_vacio_no_se_guarda_ni_se_publica(string? texto)
    {
        await Assert.ThrowsAsync<ExcepcionDeDominio>(
            () => crearNota.Ejecutar(usuarioId, new CrearNotaComando(Emocion.Duda, texto), CancellationToken.None));

        Assert.Empty(notas.Guardadas);
        Assert.Empty(eventos.Publicados);
    }

    [Fact]
    public async Task Un_desahogo_que_pasa_del_limite_no_se_guarda_ni_se_publica()
    {
        var demasiado = new string('a', TextoDesahogo.LongitudMaxima + 1);

        await Assert.ThrowsAsync<ExcepcionDeDominio>(
            () => crearNota.Ejecutar(usuarioId, new CrearNotaComando(Emocion.Duda, demasiado), CancellationToken.None));

        Assert.Empty(notas.Guardadas);
        Assert.Empty(eventos.Publicados);
    }

    [Fact]
    public async Task Cada_desahogo_es_una_nota_nueva_con_su_propio_id()
    {
        var primera = await crearNota.Ejecutar(usuarioId, new CrearNotaComando(Emocion.Duda, "Uno."), CancellationToken.None);
        var segunda = await crearNota.Ejecutar(usuarioId, new CrearNotaComando(Emocion.Duda, "Uno."), CancellationToken.None);

        Assert.NotEqual(primera.NotaId, segunda.NotaId);
        Assert.Equal(2, notas.Guardadas.Count);
    }

    [Fact]
    public void El_comando_no_se_imprime_con_el_texto()
    {
        var comando = new CrearNotaComando(Emocion.Tristeza, "texto privado");

        Assert.DoesNotContain("privado", comando.ToString(), StringComparison.Ordinal);
    }
}
