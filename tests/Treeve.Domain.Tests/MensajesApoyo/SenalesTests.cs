using Treeve.Domain.Desahogos;
using Treeve.Domain.MensajesApoyo;

namespace Treeve.Domain.Tests.MensajesApoyo;

/// <summary>Cómo se leen las señales del texto: normalización, patrones, temas, intensidad y crisis.</summary>
public class SenalesTests
{
    [Theory]
    [InlineData("¡Mi MAMÁ, otra vez!", "mi mama otra vez")]
    [InlineData("Ñandú   y\tpingüino...", "nandu y pinguino")]
    [InlineData("", "")]
    public void Normalizar_quita_tildes_mayusculas_y_signos(string texto, string esperado)
    {
        Assert.Equal(esperado, TextoNormalizado.Normalizar(texto));
    }

    [Theory]
    [InlineData("mamá", "Mi mama llamó", true)]
    [InlineData("mamá", "Una mamadera", false)]
    [InlineData("trabaj*", "Sigo trabajando", true)]
    [InlineData("quiero morir*", "A veces me quiero morir", true)]
    [InlineData("quiero morir*", "morir no quiero", false)]
    public void Un_patron_busca_palabras_completas_y_en_orden(string patron, string texto, bool encuentra)
    {
        Assert.Equal(encuentra, TextoNormalizado.Desde(texto).Contiene(PatronDeTexto.Crear(patron)));
    }

    [Theory]
    [InlineData("tra*bajo")]
    [InlineData("*")]
    [InlineData("   ")]
    public void Un_patron_solo_admite_el_comodin_al_final_de_una_palabra(string patron)
    {
        Assert.ThrowsAny<ArgumentException>(() => PatronDeTexto.Crear(patron));
    }

    [Fact]
    public void El_texto_normalizado_no_se_imprime()
    {
        Assert.DoesNotContain("secreto", TextoNormalizado.Desde("mi secreto").ToString(), StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("Hoy peleé con mi mamá", Tema.Familia)]
    [InlineData("Mi jefe y el trabajo, y luego mi mamá", Tema.Trabajo)]
    [InlineData("Llueve mucho en noviembre", null)]
    public void Detecta_el_tema_con_mas_palabras_clave(string texto, Tema? esperado)
    {
        Assert.Equal(esperado, CatalogoDePrueba.Temas().Detectar(TextoNormalizado.Desde(texto)));
    }

    [Theory]
    [InlineData("Hoy me siento un poco triste.", Intensidad.Baja)]
    [InlineData("¿Por qué a mí??", Intensidad.Media)]
    [InlineData("NADA ME SALE BIEN, NUNCA", Intensidad.Alta)]
    public void Mide_la_intensidad_por_pistas(string texto, Intensidad esperada)
    {
        Assert.Equal(esperada, MedidorDeIntensidad.Medir(texto, TextoNormalizado.Desde(texto)));
    }

    [Fact]
    public void Un_texto_largo_cuenta_como_pista_de_intensidad()
    {
        var texto = string.Join(' ', Enumerable.Repeat("hoy fue un día pesado", 20));

        Assert.Equal(Intensidad.Media, MedidorDeIntensidad.Medir(texto, TextoNormalizado.Desde(texto)));
    }

    [Fact]
    public void La_regla_de_crisis_necesita_al_menos_una_frase()
    {
        Assert.Throws<ArgumentException>(() => new ReglaCrisis([], []));
    }

    [Fact]
    public void Las_senales_no_se_imprimen()
    {
        var senales = new Senales(Emocion.Tristeza, Tema.Familia, Intensidad.Alta);

        Assert.DoesNotContain("Familia", senales.ToString(), StringComparison.Ordinal);
    }
}
