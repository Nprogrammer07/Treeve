using Treeve.Infrastructure.Seguridad;

namespace Treeve.Infrastructure.Tests.Seguridad;

public class HasheadorDeContrasenasPbkdf2Tests
{
    private readonly HasheadorDeContrasenasPbkdf2 hasheador = new();

    [Fact]
    public void Verifica_la_contrasena_correcta_y_rechaza_otra()
    {
        var hash = hasheador.Hashear("Treeve2026");

        Assert.True(hasheador.Verificar(hash, "Treeve2026"));
        Assert.False(hasheador.Verificar(hash, "Treeve2027"));
    }

    [Fact]
    public void Guarda_algoritmo_iteraciones_sal_y_hash_pero_nunca_la_contrasena()
    {
        var hash = hasheador.Hashear("Treeve2026");

        var partes = hash.Split('$');
        Assert.Equal(4, partes.Length);
        Assert.Equal("pbkdf2-sha256", partes[0]);
        Assert.Equal("600000", partes[1]);
        Assert.DoesNotContain("Treeve2026", hash, StringComparison.Ordinal);
    }

    [Fact]
    public void La_misma_contrasena_produce_hashes_distintos_por_la_sal()
    {
        Assert.NotEqual(hasheador.Hashear("Treeve2026"), hasheador.Hashear("Treeve2026"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("texto-sin-formato")]
    [InlineData("pbkdf2-sha256$abc$c2Fs$aGFzaA==")]
    [InlineData("md5$1$c2Fs$aGFzaA==")]
    public void Un_hash_ausente_o_mal_formado_nunca_verifica(string? hash)
    {
        Assert.False(hasheador.Verificar(hash, "Treeve2026"));
    }
}
