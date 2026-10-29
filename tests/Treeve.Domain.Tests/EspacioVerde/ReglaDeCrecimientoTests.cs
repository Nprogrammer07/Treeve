using Treeve.Domain.Comun;
using Treeve.Domain.Desahogos;
using Treeve.Domain.EspacioVerde;

namespace Treeve.Domain.Tests.EspacioVerde;

public class ReglaDeCrecimientoTests
{
    private readonly ReglaDeCrecimiento regla = new();

    private (int Arbol, int Flores, int Bosque) Niveles(int riegos)
    {
        var lote = regla.Calcular(riegos);
        return (lote.Nivel(ComponenteDelLote.Arbol), lote.Nivel(ComponenteDelLote.Flores), lote.Nivel(ComponenteDelLote.Bosque));
    }

    [Fact]
    public void Un_lote_nuevo_empieza_con_todo_en_el_nivel_inicial_y_el_arbol_en_brote()
    {
        var lote = regla.Calcular(0);

        Assert.Equal((1, 1, 1), Niveles(0));
        Assert.Equal(EtapaDelArbol.Brote, lote.EtapaDelArbol);
        Assert.Equal(3, lote.RiegosParaElSiguiente);
        Assert.Equal(ComponenteDelLote.Arbol, lote.SiguienteEnCrecer);
        Assert.False(lote.Completo);
    }

    [Theory]
    [InlineData(2, 1, 1, 1)]
    [InlineData(3, 2, 1, 1)]
    [InlineData(6, 2, 2, 1)]
    [InlineData(9, 2, 2, 2)]
    [InlineData(12, 3, 2, 2)]
    [InlineData(21, 4, 3, 3)]
    [InlineData(27, 4, 4, 4)]
    public void Cada_3_desahogos_crece_un_componente_por_turnos(int riegos, int arbol, int flores, int bosque)
    {
        Assert.Equal((arbol, flores, bosque), Niveles(riegos));
    }

    [Theory]
    [InlineData(3, EtapaDelArbol.Tallo)]
    [InlineData(12, EtapaDelArbol.Flor)]
    [InlineData(21, EtapaDelArbol.ArbolAdulto)]
    public void El_arbol_pasa_por_sus_etapas(int riegos, EtapaDelArbol etapa)
    {
        Assert.Equal(etapa, regla.Calcular(riegos).EtapaDelArbol);
    }

    [Fact]
    public void Nunca_crecen_dos_componentes_a_la_vez()
    {
        for (var riego = 1; riego <= 40; riego++)
        {
            var antes = Niveles(riego - 1);
            var despues = Niveles(riego);
            var crecimientos = (despues.Arbol - antes.Arbol) + (despues.Flores - antes.Flores) + (despues.Bosque - antes.Bosque);

            Assert.Equal(riego % 3 == 0 && riego <= 27 ? 1 : 0, crecimientos);
        }
    }

    [Theory]
    [InlineData(4, 1, 2)]
    [InlineData(5, 2, 1)]
    [InlineData(6, 0, 3)]
    public void Cada_desahogo_suma_nutricion_hasta_el_siguiente_crecimiento(int riegos, int nutricion, int faltan)
    {
        var lote = regla.Calcular(riegos);

        Assert.Equal(nutricion, lote.Nutricion);
        Assert.Equal(faltan, lote.RiegosParaElSiguiente);
    }

    [Theory]
    [InlineData(27)]
    [InlineData(100)]
    public void Con_27_desahogos_el_lote_queda_completo_y_no_crece_mas(int riegos)
    {
        var lote = regla.Calcular(riegos);

        Assert.True(lote.Completo);
        Assert.Equal((4, 4, 4), Niveles(riegos));
        Assert.Null(lote.SiguienteEnCrecer);
        Assert.Equal(0, lote.RiegosParaElSiguiente);
        Assert.Equal(27, ReglaDeCrecimiento.CrecimientosPosibles * regla.DesahogosPorCrecimiento);
    }

    [Theory]
    [InlineData(3, ComponenteDelLote.Arbol)]
    [InlineData(6, ComponenteDelLote.Flores)]
    [InlineData(9, ComponenteDelLote.Bosque)]
    [InlineData(12, ComponenteDelLote.Arbol)]
    [InlineData(4, null)]
    [InlineData(30, null)]
    [InlineData(0, null)]
    public void Sabe_que_componente_crecio_con_cada_riego(int riego, ComponenteDelLote? componente)
    {
        Assert.Equal(componente, regla.CrecioConElRiego(riego));
    }

    [Fact]
    public void El_umbral_es_configurable()
    {
        var cadaDos = new ReglaDeCrecimiento(2);

        Assert.Equal(EtapaDelArbol.Tallo, cadaDos.Calcular(2).EtapaDelArbol);
        Assert.Equal(EtapaDelArbol.Brote, cadaDos.Calcular(1).EtapaDelArbol);
    }

    [Fact]
    public void El_umbral_y_los_riegos_no_pueden_ser_invalidos()
    {
        Assert.Throws<ExcepcionDeDominio>(() => new ReglaDeCrecimiento(0));
        Assert.Throws<ExcepcionDeDominio>(() => regla.Calcular(-1));
    }

    [Fact]
    public void Un_riego_usa_el_id_de_la_nota_y_no_guarda_la_emocion()
    {
        var evento = new NotaCreada(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Emocion.Tristeza, DateTimeOffset.UnixEpoch);

        var riego = Riego.PorNota(evento);

        Assert.Equal(evento.NotaId, riego.Id);
        Assert.Equal(evento.UsuarioId, riego.UsuarioId);
        Assert.Equal(evento.Fecha, riego.OcurrioEn);
        Assert.Equal(["Id", "UsuarioId", "OcurrioEn"], typeof(Riego).GetProperties().Select(p => p.Name));
    }
}
