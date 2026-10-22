using Treeve.Domain.Desahogos;
using Treeve.Domain.MensajesApoyo;

namespace Treeve.Domain.Tests.MensajesApoyo;

public class FragmentoTests
{
    private static Fragmento Crear(
        string id = "TRI-VAL-01",
        Ranura ranura = Ranura.Validacion,
        Emocion? emocion = Emocion.Tristeza,
        Tema[]? temas = null,
        Intensidad[]? intensidades = null,
        int peso = 1,
        string texto = "Lo que sientes tiene sentido.") =>
        Fragmento.Crear(id, ranura, emocion, temas ?? [], intensidades ?? [], peso, texto);

    [Theory]
    [InlineData("TRI-VAL-1")]
    [InlineData("RAB-VAL-01")]
    [InlineData("TRI-REF-01")]
    [InlineData("GEN-VAL-01")]
    public void El_id_dice_su_emocion_y_su_ranura(string id)
    {
        Assert.Throws<ArgumentException>(() => Crear(id: id));
    }

    [Fact]
    public void GEN_identifica_a_los_que_sirven_para_cualquier_emocion()
    {
        var fragmento = Crear(id: "GEN-VAL-01", emocion: null);

        Assert.Null(fragmento.Emocion);
    }

    [Theory]
    [InlineData("Sin punto final")]
    [InlineData("Hola {nombre}.")]
    [InlineData("   ")]
    public void El_texto_es_una_oracion_completa_y_solo_usa_el_apodo_como_marcador(string texto)
    {
        Assert.Throws<ArgumentException>(() => Crear(texto: texto));
    }

    [Fact]
    public void El_saludo_nombra_a_la_persona()
    {
        Assert.Throws<ArgumentException>(() => Crear("GEN-SAL-01", Ranura.Saludo, emocion: null, texto: "Hola."));
        Assert.Equal("Hola, Nico.", Crear("GEN-SAL-01", Ranura.Saludo, emocion: null, texto: "Hola, {apodo}.").TextoPara("Nico"));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(Fragmento.PesoMaximo + 1)]
    public void El_peso_esta_entre_1_y_el_maximo(int peso)
    {
        Assert.Throws<ArgumentException>(() => Crear(peso: peso));
    }

    [Fact]
    public void Entre_mas_etiquetas_mas_especifico()
    {
        Assert.Equal(0, Crear(id: "GEN-VAL-01", emocion: null).Especificidad);
        Assert.Equal(1, Crear().Especificidad);
        Assert.Equal(3, Crear(temas: [Tema.Familia]).Especificidad);
        Assert.Equal(4, Crear(temas: [Tema.Familia], intensidades: [Intensidad.Alta]).Especificidad);
    }

    [Fact]
    public void Encaja_solo_con_las_senales_de_sus_etiquetas()
    {
        var fragmento = Crear(temas: [Tema.Familia], intensidades: [Intensidad.Media, Intensidad.Alta]);

        Assert.True(fragmento.EncajaCon(new Senales(Emocion.Tristeza, Tema.Familia, Intensidad.Alta)));
        Assert.False(fragmento.EncajaCon(new Senales(Emocion.Rabia, Tema.Familia, Intensidad.Alta)));
        Assert.False(fragmento.EncajaCon(new Senales(Emocion.Tristeza, Tema.Trabajo, Intensidad.Alta)));
        Assert.False(fragmento.EncajaCon(new Senales(Emocion.Tristeza, null, Intensidad.Alta)));
        Assert.False(fragmento.EncajaCon(new Senales(Emocion.Tristeza, Tema.Familia, Intensidad.Baja)));
    }

    [Fact]
    public void El_catalogo_rechaza_ids_repetidos()
    {
        var fragmentos = CatalogoDePrueba.Fragmentos();
        fragmentos.Add(fragmentos[0]);

        Assert.Throws<ArgumentException>(() =>
            CatalogoDeMensajes.Crear(fragmentos, CatalogoDePrueba.Temas(), CatalogoDePrueba.Crisis(), CatalogoDePrueba.MensajeDeCrisis));
    }

    [Fact]
    public void El_catalogo_exige_un_fragmento_general_por_emocion_y_ranura()
    {
        // Sin los puentes generales de miedo, un desahogo de miedo quedaría sin respuesta.
        var fragmentos = CatalogoDePrueba.Fragmentos().Where(f => !f.Id.StartsWith("MIE-PUE-", StringComparison.Ordinal));

        var error = Assert.Throws<ArgumentException>(() =>
            CatalogoDeMensajes.Crear(fragmentos, CatalogoDePrueba.Temas(), CatalogoDePrueba.Crisis(), CatalogoDePrueba.MensajeDeCrisis));
        Assert.Contains("Miedo/Puente", error.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("")]
    [InlineData("Llama al {telefono}.")]
    public void El_catalogo_exige_un_mensaje_de_crisis_valido(string mensaje)
    {
        Assert.Throws<ArgumentException>(() =>
            CatalogoDeMensajes.Crear(CatalogoDePrueba.Fragmentos(), CatalogoDePrueba.Temas(), CatalogoDePrueba.Crisis(), mensaje));
    }
}
