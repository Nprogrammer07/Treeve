using Treeve.Domain.Comun;
using Treeve.Domain.Identidad;

namespace Treeve.Domain.Tests.Identidad;

public class PoliticaDeContrasenaTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("abc123")]
    [InlineData("soloLetrasAqui")]
    [InlineData("12345678")]
    public void Rechaza_contrasenas_que_no_cumplen_la_politica(string? contrasena)
    {
        Assert.Throws<ExcepcionDeDominio>(() => PoliticaDeContrasena.Validar(contrasena));
    }

    [Fact]
    public void Rechaza_contrasenas_demasiado_largas()
    {
        var larga = new string('a', PoliticaDeContrasena.LongitudMaxima) + "1";

        Assert.Throws<ExcepcionDeDominio>(() => PoliticaDeContrasena.Validar(larga));
    }

    [Fact]
    public void Acepta_una_contrasena_con_letras_y_numeros()
    {
        Assert.Equal("Treeve2026", PoliticaDeContrasena.Validar("Treeve2026"));
    }

    [Fact]
    public void El_mensaje_de_error_no_incluye_la_contrasena()
    {
        var error = Assert.Throws<ExcepcionDeDominio>(() => PoliticaDeContrasena.Validar("secreto"));

        Assert.DoesNotContain("secreto", error.Message, StringComparison.Ordinal);
    }
}
