using Treeve.Application.EspacioVerde;
using Treeve.Domain.Desahogos;
using Treeve.Domain.EspacioVerde;
using Treeve.Domain.Services.EspacioVerde;

namespace Treeve.Application.Tests.EspacioVerde;

/// <summary>Imita la llave primaria de riegos (el id de la nota): la misma nota no se guarda dos veces.</summary>
internal sealed class RepositorioRiegosFalso : IRepositorioRiegos
{
    public List<Riego> Guardados { get; } = [];

    public Task<bool> RegistrarSiNoExiste(Riego riego, CancellationToken ct)
    {
        if (Guardados.Any(r => r.Id == riego.Id))
        {
            return Task.FromResult(false);
        }

        Guardados.Add(riego);
        return Task.FromResult(true);
    }

    public Task<int> ContarDeUsuario(Guid usuarioId, CancellationToken ct) =>
        Task.FromResult(Guardados.Count(r => r.UsuarioId == usuarioId));
}

public class EspacioVerdeTests
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 29, 20, 0, 0, TimeSpan.FromHours(-5));

    private readonly RepositorioRiegosFalso riegos = new();
    private readonly AlCrearseNota alCrearseNota;
    private readonly ConsultarEspacioVerde consultar;
    private readonly Guid ana = Guid.NewGuid();

    public EspacioVerdeTests()
    {
        alCrearseNota = new AlCrearseNota(riegos);
        consultar = new ConsultarEspacioVerde(riegos, new ReglaDeCrecimiento());
    }

    private static NotaCreada Nota(Guid usuarioId)
    {
        var notaId = Guid.NewGuid();
        return new NotaCreada(notaId, notaId, usuarioId, Emocion.Tristeza, Ahora);
    }

    private async Task Desahogar(Guid usuarioId, int veces)
    {
        for (var i = 0; i < veces; i++)
        {
            await alCrearseNota.Manejar(Nota(usuarioId), CancellationToken.None);
        }
    }

    [Fact]
    public async Task Cada_desahogo_riega_el_lote_de_su_duena()
    {
        await Desahogar(ana, 7);

        var lote = await consultar.Ejecutar(ana, CancellationToken.None);

        Assert.Equal(7, lote.Riegos);
        Assert.Equal(EtapaDelArbol.Tallo, lote.EtapaDelArbol);
        Assert.Equal(2, lote.Nivel(ComponenteDelLote.Flores));
        Assert.Equal(1, lote.Nivel(ComponenteDelLote.Bosque));
        Assert.Equal(ComponenteDelLote.Bosque, lote.SiguienteEnCrecer);
        Assert.Equal(2, lote.RiegosParaElSiguiente);
    }

    [Fact]
    public async Task El_mismo_desahogo_dos_veces_no_hace_crecer_el_lote_dos_veces()
    {
        var nota = Nota(ana);

        await alCrearseNota.Manejar(nota, CancellationToken.None);
        await alCrearseNota.Manejar(nota, CancellationToken.None);
        await alCrearseNota.Manejar(nota, CancellationToken.None);

        Assert.Equal(1, (await consultar.Ejecutar(ana, CancellationToken.None)).Riegos);
    }

    [Fact]
    public async Task Cada_persona_ve_solo_su_lote()
    {
        await Desahogar(ana, 3);
        await Desahogar(Guid.NewGuid(), 9);

        var lote = await consultar.Ejecutar(ana, CancellationToken.None);

        Assert.Equal(3, lote.Riegos);
        Assert.Equal(EtapaDelArbol.Tallo, lote.EtapaDelArbol);
    }

    [Fact]
    public async Task Una_persona_sin_desahogos_tiene_su_lote_en_brote()
    {
        var lote = await consultar.Ejecutar(Guid.NewGuid(), CancellationToken.None);

        Assert.Equal(EtapaDelArbol.Brote, lote.EtapaDelArbol);
        Assert.Equal(0, lote.Riegos);
    }
}
