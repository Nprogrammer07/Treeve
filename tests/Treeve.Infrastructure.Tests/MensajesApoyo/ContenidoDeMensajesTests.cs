using Treeve.Domain.Desahogos;
using Treeve.Domain.MensajesApoyo;
using Treeve.Domain.Services.MensajesApoyo;
using Treeve.Infrastructure.MensajesApoyo;

namespace Treeve.Infrastructure.Tests.MensajesApoyo;

/// <summary>
/// Revisa el contenido real (los JSON de Contenido/). Si alguien agrega un fragmento mal escrito o deja una
/// emoción sin suficientes fragmentos, la CI falla antes de llegar a producción.
/// </summary>
public class ContenidoDeMensajesTests
{
    private static readonly CatalogoDeMensajes Catalogo = RepositorioFragmentosJson.Cargar();

    public static TheoryData<Emocion, Ranura> EmocionesYRanuras()
    {
        var datos = new TheoryData<Emocion, Ranura>();
        foreach (var emocion in Enum.GetValues<Emocion>())
        {
            foreach (var ranura in Enum.GetValues<Ranura>())
            {
                datos.Add(emocion, ranura);
            }
        }

        return datos;
    }

    [Theory]
    [MemberData(nameof(EmocionesYRanuras))]
    public void Cada_emocion_tiene_suficientes_fragmentos_generales_para_no_repetir(Emocion emocion, Ranura ranura)
    {
        var generales = Catalogo.DeLaRanura(ranura).Count(f => f.EsGeneralPara(emocion));

        // Las 5 respuestas anteriores pueden haber usado 5 fragmentos de esta ranura: hace falta uno más.
        Assert.True(
            generales > MotorDeRespuesta.RespuestasSinRepetir,
            $"{emocion}/{ranura} tiene {generales} fragmentos generales; necesita al menos {MotorDeRespuesta.RespuestasSinRepetir + 1}.");
    }

    [Fact]
    public void Con_el_contenido_real_ninguna_respuesta_repite_fragmentos_de_las_5_anteriores()
    {
        var motor = new MotorDeRespuesta(Catalogo);
        string[] textos =
        [
            "Hoy fue un día raro.",
            "Discutí otra vez con mi mamá y mi hermano, NADA cambia nunca!!",
            "El trabajo me tiene agotada, mi jefe no para.",
            "Tengo parcial mañana y no he estudiado.",
            "Me pagaron la quincena y pude saldar una deuda.",
        ];

        foreach (var emocion in Enum.GetValues<Emocion>())
        {
            var historial = new List<IReadOnlyList<string>>();
            for (var i = 0; i < 50; i++)
            {
                var recientes = historial.TakeLast(MotorDeRespuesta.RespuestasSinRepetir).Reverse().SelectMany(ids => ids).ToList();

                var mensaje = motor.Generar(new PeticionDeMensaje("Nico", emocion, textos[i % textos.Length], recientes, i));

                Assert.False(mensaje.EsDeCrisis);
                Assert.Empty(mensaje.FragmentosUsados.Intersect(recientes));
                historial.Add(mensaje.FragmentosUsados);
            }
        }
    }

    [Theory]
    [InlineData("Ya no quiero vivir así")]
    [InlineData("QUIERO MORIRME")]
    [InlineData("A veces pienso en suicidarme")]
    [InlineData("Anoche me corté los brazos otra vez")]
    [InlineData("Siento que soy una carga para todos")]
    [InlineData("Todos estarían mejor sin mí")]
    [InlineData("Mi pareja me pega cuando se enoja")]
    public void La_regla_de_crisis_reconoce_las_frases_de_riesgo(string texto)
    {
        Assert.True(Catalogo.Crisis.Detecta(TextoNormalizado.Desde(texto)));
    }

    [Theory]
    [InlineData("Me muero de risa con mis amigos")]
    [InlineData("Me voy a matar estudiando para el parcial")]
    [InlineData("Me quiero morir de la vergüenza")]
    [InlineData("Mañana voy a cortarme el pelo")]
    [InlineData("Se me pegó esa canción todo el día")]
    [InlineData("Este trabajo me tiene harta y no aguanto a mi jefe")]
    public void La_regla_de_crisis_no_confunde_expresiones_comunes(string texto)
    {
        Assert.False(Catalogo.Crisis.Detecta(TextoNormalizado.Desde(texto)));
    }

    [Fact]
    public void El_mensaje_de_crisis_nombra_a_la_persona_y_no_se_compone()
    {
        var mensaje = new MotorDeRespuesta(Catalogo).Generar(new PeticionDeMensaje("Nico", Emocion.Tristeza, "quiero morirme", [], 1));

        Assert.True(mensaje.EsDeCrisis);
        Assert.StartsWith("Nico,", mensaje.Texto, StringComparison.Ordinal);
        Assert.Empty(mensaje.FragmentosUsados);
    }

    [Theory]
    [InlineData("Peleé con mi mamá", Tema.Familia)]
    [InlineData("Mi jefe me regañó en la oficina", Tema.Trabajo)]
    [InlineData("Tengo examen de cálculo", Tema.Estudio)]
    [InlineData("Terminé con mi novio", Tema.Pareja)]
    [InlineData("Mi mejor amiga se fue del país", Tema.Amistad)]
    [InlineData("Me dieron el diagnóstico en la clínica", Tema.Salud)]
    [InlineData("No me alcanza la plata para el arriendo", Tema.Dinero)]
    public void Detecta_los_temas_con_las_palabras_clave_reales(string texto, Tema tema)
    {
        Assert.Equal(tema, Catalogo.Temas.Detectar(TextoNormalizado.Desde(texto)));
    }
}
