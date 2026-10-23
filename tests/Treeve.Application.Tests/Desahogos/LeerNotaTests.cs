using Treeve.Application.Comun;
using Treeve.Application.Desahogos;
using Treeve.Application.Tests.Identidad;
using Treeve.Domain.Desahogos;

namespace Treeve.Application.Tests.Desahogos;

public class LeerNotaTests
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 23, 9, 30, 0, TimeSpan.FromHours(-5));

    private readonly RepositorioNotasFalso notas = new();
    private readonly CifradorFalso cifrador = new();
    private readonly CrearNota crearNota;
    private readonly LeerNota leerNota;
    private readonly Guid duena = Guid.NewGuid();

    public LeerNotaTests()
    {
        crearNota = new CrearNota(notas, cifrador, new RelojManual(Ahora), new PublicadorEventosFalso());
        leerNota = new LeerNota(notas, cifrador);
    }

    [Fact]
    public async Task La_duena_lee_su_desahogo_tal_como_lo_escribio()
    {
        var guardada = await crearNota.Ejecutar(duena, new CrearNotaComando(Emocion.Felicidad, "¡Hoy fue un gran día!"), CancellationToken.None);

        var nota = await leerNota.Ejecutar(duena, guardada.NotaId, CancellationToken.None);

        Assert.Equal("¡Hoy fue un gran día!", nota.Texto);
        Assert.Equal(Emocion.Felicidad, nota.Emocion);
        Assert.Equal(Ahora, nota.CreadaEn);
    }

    [Fact]
    public async Task Otra_persona_no_puede_leerlo()
    {
        var guardada = await crearNota.Ejecutar(duena, new CrearNotaComando(Emocion.Tristeza, "Algo privado."), CancellationToken.None);

        await Assert.ThrowsAsync<AccesoDenegado>(() => leerNota.Ejecutar(Guid.NewGuid(), guardada.NotaId, CancellationToken.None));
    }

    [Fact]
    public async Task Si_no_existe_responde_lo_mismo_que_si_es_de_otra_persona()
    {
        var guardada = await crearNota.Ejecutar(duena, new CrearNotaComando(Emocion.Tristeza, "Algo privado."), CancellationToken.None);

        var ajena = await Assert.ThrowsAsync<AccesoDenegado>(() => leerNota.Ejecutar(Guid.NewGuid(), guardada.NotaId, CancellationToken.None));
        var inexistente = await Assert.ThrowsAsync<AccesoDenegado>(() => leerNota.Ejecutar(duena, Guid.NewGuid(), CancellationToken.None));

        Assert.Equal(ajena.Message, inexistente.Message);
    }

    [Fact]
    public async Task El_texto_cifrado_copiado_a_la_nota_de_otra_persona_no_se_descifra()
    {
        var guardada = await crearNota.Ejecutar(duena, new CrearNotaComando(Emocion.Rabia, "Esto es mío."), CancellationToken.None);
        var original = Assert.Single(notas.Guardadas);

        // Alguien con acceso a la base de datos copia el texto cifrado a una nota suya.
        var otra = Guid.NewGuid();
        var copia = Nota.Crear(Guid.NewGuid(), otra, Emocion.Rabia, original.TextoCifrado, Ahora);
        notas.Guardadas.Add(copia);

        Assert.NotEqual(guardada.NotaId, copia.Id);
        await Assert.ThrowsAnyAsync<Exception>(() => leerNota.Ejecutar(otra, copia.Id, CancellationToken.None));
    }

    [Fact]
    public async Task La_nota_leida_no_se_imprime_con_el_texto()
    {
        var guardada = await crearNota.Ejecutar(duena, new CrearNotaComando(Emocion.Duda, "texto privado"), CancellationToken.None);

        var nota = await leerNota.Ejecutar(duena, guardada.NotaId, CancellationToken.None);

        Assert.DoesNotContain("privado", nota.ToString(), StringComparison.Ordinal);
    }
}
