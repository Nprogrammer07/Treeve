using Treeve.Domain.Comun;
using Treeve.Domain.Desahogos;

namespace Treeve.Domain.Tests.Desahogos;

public class TextoDesahogoTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("\n\t ")]
    public void Un_desahogo_vacio_no_es_valido(string? texto)
    {
        Assert.Throws<ExcepcionDeDominio>(() => TextoDesahogo.Crear(texto));
    }

    [Fact]
    public void Acepta_justo_el_limite_de_caracteres()
    {
        var texto = new string('a', TextoDesahogo.LongitudMaxima);

        Assert.Equal(texto, TextoDesahogo.Crear(texto).Valor);
    }

    [Fact]
    public void Rechaza_un_caracter_mas_que_el_limite()
    {
        var excepcion = Assert.Throws<ExcepcionDeDominio>(() => TextoDesahogo.Crear(new string('a', TextoDesahogo.LongitudMaxima + 1)));

        Assert.Contains(TextoDesahogo.LongitudMaxima.ToString(), excepcion.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void El_limite_es_el_que_muestra_el_frontend()
    {
        // HojaDePapel.tsx tiene LONGITUD_MAXIMA = 2000; si cambia uno, hay que cambiar el otro.
        Assert.Equal(2000, TextoDesahogo.LongitudMaxima);
    }

    [Fact]
    public void Conserva_el_texto_tal_como_se_escribio()
    {
        var texto = "  Hoy fue un día pesado.\n\nPero respiré.  ";

        Assert.Equal(texto, TextoDesahogo.Crear(texto).Valor);
    }

    [Fact]
    public void Nunca_se_imprime_ni_el_mensaje_de_error_lleva_el_texto()
    {
        var texto = TextoDesahogo.Crear("mi secreto");
        var excepcion = Assert.Throws<ExcepcionDeDominio>(() => TextoDesahogo.Crear(new string('x', TextoDesahogo.LongitudMaxima + 1)));

        Assert.DoesNotContain("secreto", texto.ToString(), StringComparison.Ordinal);
        Assert.DoesNotContain("xxxx", excepcion.Message, StringComparison.Ordinal);
    }
}
