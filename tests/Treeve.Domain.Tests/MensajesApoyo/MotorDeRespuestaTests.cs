using Treeve.Domain.Desahogos;
using Treeve.Domain.MensajesApoyo;
using Treeve.Domain.Services.MensajesApoyo;

namespace Treeve.Domain.Tests.MensajesApoyo;

public class MotorDeRespuestaTests
{
    private const string Apodo = "Nico";
    private const string TextoTranquilo = "Hoy fue un día raro y me siento así.";

    private readonly MotorDeRespuesta motor = new(CatalogoDePrueba.Crear());

    private MensajeDeApoyo Generar(
        string texto = TextoTranquilo,
        Emocion emocion = Emocion.Tristeza,
        IReadOnlyList<string>? recientes = null,
        int semilla = 7) =>
        motor.Generar(new PeticionDeMensaje(Apodo, emocion, texto, recientes ?? [], semilla));

    [Fact]
    public void Compone_un_fragmento_por_ranura_en_orden_y_nombra_a_la_persona()
    {
        var mensaje = Generar();

        Assert.False(mensaje.EsDeCrisis);
        Assert.Equal(["SAL", "VAL", "REF", "CON", "PUE"], mensaje.FragmentosUsados.Select(id => id[4..7]));
        Assert.StartsWith("Hola Nico", mensaje.Texto, StringComparison.Ordinal);
    }

    [Fact]
    public void Con_la_misma_semilla_arma_el_mismo_mensaje()
    {
        Assert.Equal(Generar(semilla: 123).FragmentosUsados, Generar(semilla: 123).FragmentosUsados);
    }

    [Theory]
    [InlineData(Emocion.Tristeza, "TRI")]
    [InlineData(Emocion.Felicidad, "FEL")]
    public void La_emocion_elegida_define_la_rama(Emocion emocion, string codigo)
    {
        var mensaje = Generar(emocion: emocion);

        Assert.All(mensaje.FragmentosUsados.Skip(1), id => Assert.StartsWith(codigo, id, StringComparison.Ordinal));
    }

    [Theory]
    [InlineData("Ya no aguanto, QUIERO MORIRME")]
    [InlineData("me voy a matar")]
    public void Con_senales_de_crisis_responde_el_mensaje_fijo_sin_componer(string texto)
    {
        var mensaje = Generar(texto);

        Assert.True(mensaje.EsDeCrisis);
        Assert.Equal("Nico, este es el mensaje fijo de crisis.", mensaje.Texto);
        Assert.Empty(mensaje.FragmentosUsados);
    }

    [Theory]
    [InlineData("Me muero de risa, pero también quiero morir")]
    [InlineData("Quiero morir, aunque me voy a matar estudiando")]
    public void Una_expresion_comun_no_tapa_una_senal_de_crisis_en_otra_parte(string texto)
    {
        Assert.True(Generar(texto).EsDeCrisis);
    }

    [Theory]
    [InlineData("Me quiero morir de risa con esto")]
    [InlineData("Me voy a matar estudiando para el parcial")]
    public void Las_expresiones_comunes_no_son_crisis(string texto)
    {
        Assert.False(Generar(texto).EsDeCrisis);
    }

    [Fact]
    public void Prefiere_el_reflejo_del_tema_detectado()
    {
        var mensaje = Generar("Hoy discutí con mi mamá");

        Assert.Equal(CatalogoDePrueba.ReflejoDeFamilia, mensaje.FragmentosUsados[2]);
    }

    [Fact]
    public void Con_intensidad_alta_prefiere_la_validacion_intensa()
    {
        var mensaje = Generar("NADA ME SALE BIEN, NUNCA!!!");

        Assert.Equal(CatalogoDePrueba.ValidacionIntensaDeTristeza, mensaje.FragmentosUsados[1]);
    }

    [Fact]
    public void Si_el_fragmento_especifico_ya_se_uso_vuelve_a_uno_general()
    {
        var mensaje = Generar("Hoy discutí con mi mamá", recientes: [CatalogoDePrueba.ReflejoDeFamilia]);

        Assert.StartsWith("TRI-REF-", mensaje.FragmentosUsados[2], StringComparison.Ordinal);
    }

    [Fact]
    public void Ninguna_respuesta_repite_fragmentos_de_las_5_anteriores()
    {
        var historial = new List<IReadOnlyList<string>>();
        var textos = new[] { TextoTranquilo, "Hoy discutí con mi mamá", "NADA ME SALE BIEN, NUNCA!!!", "Mi jefe otra vez" };

        for (var i = 0; i < 60; i++)
        {
            var recientes = historial.TakeLast(MotorDeRespuesta.RespuestasSinRepetir).Reverse().SelectMany(ids => ids).ToList();

            var mensaje = Generar(textos[i % textos.Length], recientes: recientes, semilla: i);

            Assert.Empty(mensaje.FragmentosUsados.Intersect(recientes));
            historial.Add(mensaje.FragmentosUsados);
        }
    }

    [Fact]
    public void Si_ya_uso_todos_los_candidatos_repite_el_usado_hace_mas_tiempo()
    {
        // Del más reciente al más antiguo: GEN-SAL-06 es el que lleva más tiempo sin usarse.
        var saludos = Enumerable.Range(1, CatalogoDePrueba.GeneralesPorRanura).Select(i => $"GEN-SAL-{i:00}").ToList();

        var mensaje = Generar(recientes: saludos);

        Assert.Equal("GEN-SAL-06", mensaje.FragmentosUsados[0]);
    }

    [Fact]
    public void Nunca_cita_el_texto_de_la_persona()
    {
        var mensaje = Generar("Mi perrito Firulais se perdió en el parque Simón Bolívar");

        Assert.DoesNotContain("Firulais", mensaje.Texto, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Bolívar", mensaje.Texto, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void El_mensaje_y_la_peticion_no_se_imprimen()
    {
        var peticion = new PeticionDeMensaje(Apodo, Emocion.Tristeza, "texto privado", [], 1);

        Assert.DoesNotContain("privado", peticion.ToString(), StringComparison.Ordinal);
        Assert.DoesNotContain("Nico", motor.Generar(peticion).ToString(), StringComparison.Ordinal);
    }
}
