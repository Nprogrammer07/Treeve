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
    /// <summary>HU-06: al menos 8 variantes por ranura y emoción. Con 6 ya bastaría para no repetir en 5 respuestas.</summary>
    private const int VariantesMinimas = 8;

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
    public void Cada_emocion_tiene_al_menos_8_fragmentos_generales_por_ranura(Emocion emocion, Ranura ranura)
    {
        // Generales (sin tema ni intensidad): sirven para cualquier desahogo de esa emoción, así que nunca se agotan
        // aunque las 5 respuestas anteriores hayan usado 5 de ellos.
        var generales = Catalogo.DeLaRanura(ranura).Count(f => f.EsGeneralPara(emocion));

        Assert.True(
            generales >= VariantesMinimas,
            $"{emocion}/{ranura} tiene {generales} fragmentos generales; HU-06 pide al menos {VariantesMinimas}.");
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
    [InlineData("Me siento solo desde que me mudé", Tema.Soledad)]
    [InlineData("Hoy me sentí sola en la fiesta", Tema.Soledad)]
    [InlineData("Siento la soledad en las noches", Tema.Soledad)]
    [InlineData("Hoy estoy triste y sin ganas de nada", Tema.Malestar)]
    [InlineData("Me siento mal y ya no puedo más", Tema.Malestar)]
    // Empate entre un tema nuevo y uno de siempre: gana el que cuida primero cómo se siente la persona.
    [InlineData("Nadie me entiende en casa", Tema.Soledad)]
    [InlineData("Hoy me siento feliz", Tema.Alegria)]
    [InlineData("Estoy muy bien, gracias", Tema.Alegria)]
    // Una negación vuelve la frase positiva en malestar, no en alegría.
    [InlineData("No me siento feliz hoy", Tema.Malestar)]
    [InlineData("No me siento bien", Tema.Malestar)]
    [InlineData("No estoy muy bien", Tema.Malestar)]
    public void Detecta_los_temas_con_las_palabras_clave_reales(string texto, Tema tema)
    {
        Assert.Equal(tema, Catalogo.Temas.Detectar(TextoNormalizado.Desde(texto)));
    }

    [Theory]
    [InlineData("Solo quería contarlo, gracias por escuchar")]
    [InlineData("Estoy solucionando un problema con mi proyecto")]
    [InlineData("Hoy el día no estuvo mal")]
    [InlineData("Vi una película muy triste y la disfruté")]
    public void Las_palabras_sueltas_no_activan_soledad_ni_malestar(string texto)
    {
        // "solo" también es "solamente" y "mal" aparece en "no estuvo mal": las frases del tema piden más contexto.
        Assert.Null(Catalogo.Temas.Detectar(TextoNormalizado.Desde(texto)));
    }

    public static TheoryData<Tema, Ranura> TemasYRanurasDeFelicidad()
    {
        var datos = new TheoryData<Tema, Ranura>();
        foreach (var tema in new[] { Tema.Soledad, Tema.Malestar })
        {
            foreach (var ranura in new[] { Ranura.Validacion, Ranura.Reflejo, Ranura.Contraste })
            {
                datos.Add(tema, ranura);
            }
        }

        return datos;
    }

    [Theory]
    [MemberData(nameof(TemasYRanurasDeFelicidad))]
    public void Felicidad_con_soledad_o_malestar_tiene_fragmentos_para_no_agotarse(Tema tema, Ranura ranura)
    {
        // Con 5 respuestas sin repetir hacen falta al menos 6: si no, el motor volvería a los fragmentos festivos.
        var propios = Catalogo.DeLaRanura(ranura).Count(f => f.Emocion == Emocion.Felicidad && f.Temas.Contains(tema));

        Assert.True(
            propios >= MotorDeRespuesta.RespuestasSinRepetir + 1,
            $"Felicidad/{tema}/{ranura} tiene {propios} fragmentos; hacen falta al menos {MotorDeRespuesta.RespuestasSinRepetir + 1}.");
    }

    [Theory]
    [InlineData("Me siento solo", Tema.Soledad)]
    [InlineData("Hoy estoy triste y sin ganas de nada", Tema.Malestar)]
    public void Con_felicidad_elegida_y_un_texto_de_soledad_o_malestar_no_celebra(string texto, Tema tema)
    {
        var motor = new MotorDeRespuesta(Catalogo);
        var porId = Catalogo.Fragmentos.ToDictionary(f => f.Id);
        var historial = new List<IReadOnlyList<string>>();

        for (var i = 0; i < 60; i++)
        {
            var recientes = historial.TakeLast(MotorDeRespuesta.RespuestasSinRepetir).Reverse().SelectMany(ids => ids).ToList();

            var mensaje = motor.Generar(new PeticionDeMensaje("Nico", Emocion.Felicidad, texto, recientes, i));

            Assert.False(mensaje.EsDeCrisis);
            foreach (var id in mensaje.FragmentosUsados)
            {
                var fragmento = porId[id];
                switch (fragmento.Ranura)
                {
                    case Ranura.Validacion or Ranura.Contraste:
                        // Sin esta combinación saldrían frases como "Qué bonito que te sientas así".
                        Assert.True(
                            fragmento.Emocion == Emocion.Felicidad && fragmento.Temas.Contains(tema),
                            $"{id} no es de la combinación felicidad + {tema}.");
                        break;
                    case Ranura.Reflejo:
                        Assert.True(fragmento.Temas.Contains(tema), $"{id} no refleja el tema {tema}.");
                        break;
                }
            }

            historial.Add(mensaje.FragmentosUsados);
        }
    }

    [Fact]
    public void Con_felicidad_y_un_texto_alegre_sigue_celebrando()
    {
        var motor = new MotorDeRespuesta(Catalogo);
        var porId = Catalogo.Fragmentos.ToDictionary(f => f.Id);

        for (var i = 0; i < 30; i++)
        {
            var mensaje = motor.Generar(new PeticionDeMensaje("Nico", Emocion.Felicidad, "Solo quería contarlo, hoy estoy muy feliz", [], i));

            Assert.DoesNotContain(
                mensaje.FragmentosUsados,
                id => porId[id].Contradice || porId[id].Temas.Contains(Tema.Soledad) || porId[id].Temas.Contains(Tema.Malestar));
        }
    }

    [Theory]
    [InlineData(Emocion.Tristeza)]
    [InlineData(Emocion.Rabia)]
    [InlineData(Emocion.Miedo)]
    public void Con_una_emocion_negativa_y_un_texto_alegre_no_trata_la_alegria_como_algo_malo(Emocion emocion)
    {
        var motor = new MotorDeRespuesta(Catalogo);
        var porId = Catalogo.Fragmentos.ToDictionary(f => f.Id);
        var historial = new List<IReadOnlyList<string>>();

        for (var i = 0; i < 60; i++)
        {
            var recientes = historial.TakeLast(MotorDeRespuesta.RespuestasSinRepetir).Reverse().SelectMany(ids => ids).ToList();

            var mensaje = motor.Generar(new PeticionDeMensaje("Nico", emocion, "Hoy me siento feliz", recientes, i));

            Assert.False(mensaje.EsDeCrisis);
            foreach (var id in mensaje.FragmentosUsados)
            {
                // Validación, reflejo y contraste salen del conjunto neutro, no del consuelo propio de la emoción.
                if (porId[id].Ranura is Ranura.Validacion or Ranura.Reflejo or Ranura.Contraste)
                {
                    Assert.True(porId[id].Contradice, $"{id} no es un fragmento de contradicción.");
                }
            }

            historial.Add(mensaje.FragmentosUsados);
        }
    }

    [Fact]
    public void Con_duda_un_texto_alegre_no_se_considera_contradiccion()
    {
        var motor = new MotorDeRespuesta(Catalogo);
        var porId = Catalogo.Fragmentos.ToDictionary(f => f.Id);

        for (var i = 0; i < 30; i++)
        {
            var mensaje = motor.Generar(new PeticionDeMensaje("Nico", Emocion.Duda, "Hoy me siento feliz", [], i));

            Assert.DoesNotContain(mensaje.FragmentosUsados, id => porId[id].Contradice);
        }
    }

    [Fact]
    public void Con_una_emocion_negativa_y_un_texto_de_soledad_no_cambia_su_tono()
    {
        // Tristeza y soledad dicen lo mismo: no hay contradicción y la validación sigue siendo la de la emoción.
        var motor = new MotorDeRespuesta(Catalogo);
        var porId = Catalogo.Fragmentos.ToDictionary(f => f.Id);

        for (var i = 0; i < 30; i++)
        {
            var mensaje = motor.Generar(new PeticionDeMensaje("Nico", Emocion.Tristeza, "Me siento solo", [], i));

            Assert.DoesNotContain(mensaje.FragmentosUsados, id => porId[id].Contradice);
        }
    }

    [Theory]
    [InlineData(Ranura.Validacion)]
    [InlineData(Ranura.Reflejo)]
    [InlineData(Ranura.Contraste)]
    public void Hay_fragmentos_de_contradiccion_para_no_agotarse(Ranura ranura)
    {
        var propios = Catalogo.DeLaRanura(ranura).Count(f => f.Contradice);

        Assert.True(
            propios >= MotorDeRespuesta.RespuestasSinRepetir + 1,
            $"{ranura} tiene {propios} fragmentos de contradicción; hacen falta al menos {MotorDeRespuesta.RespuestasSinRepetir + 1}.");
    }

    [Theory]
    [InlineData(Emocion.Felicidad)]
    [InlineData(Emocion.Tristeza)]
    public void La_crisis_no_depende_de_la_emocion_ni_de_los_temas(Emocion emocion)
    {
        var mensaje = new MotorDeRespuesta(Catalogo).Generar(
            new PeticionDeMensaje("Nico", emocion, "Me siento solo y quiero morirme", [], 1));

        Assert.True(mensaje.EsDeCrisis);
    }
}
