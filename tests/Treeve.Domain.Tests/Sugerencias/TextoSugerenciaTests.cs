using Treeve.Domain.Comun;
using Treeve.Domain.Sugerencias;

namespace Treeve.Domain.Tests.Sugerencias;

public class TextoSugerenciaTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("\n\t ")]
    public void Una_sugerencia_vacia_no_es_valida(string? texto)
    {
        Assert.Throws<ExcepcionDeDominio>(() => TextoSugerencia.Crear(texto));
    }

    [Fact]
    public void Quita_los_espacios_de_los_extremos()
    {
        Assert.Equal("Modo oscuro", TextoSugerencia.Crear("  Modo oscuro \n").Valor);
    }

    [Fact]
    public void Acepta_justo_el_limite_de_caracteres()
    {
        var texto = new string('a', TextoSugerencia.LongitudMaxima);

        Assert.Equal(texto, TextoSugerencia.Crear(texto).Valor);
    }

    [Fact]
    public void Rechaza_un_caracter_mas_que_el_limite()
    {
        var excepcion = Assert.Throws<ExcepcionDeDominio>(() => TextoSugerencia.Crear(new string('a', TextoSugerencia.LongitudMaxima + 1)));

        Assert.Contains(TextoSugerencia.LongitudMaxima.ToString(), excepcion.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void No_imprime_el_texto()
    {
        Assert.DoesNotContain("modo oscuro", TextoSugerencia.Crear("modo oscuro").ToString(), StringComparison.Ordinal);
    }
}
