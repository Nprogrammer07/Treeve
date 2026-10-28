using Treeve.Application.Sugerencias;
using Treeve.Domain.Comun;
using Treeve.Domain.Services.Sugerencias;
using Treeve.Domain.Sugerencias;

namespace Treeve.Application.Tests.Sugerencias;

public class BuscarSugerenciasTests
{
    private static readonly DateTimeOffset Inicio = new(2026, 10, 26, 15, 0, 0, TimeSpan.FromHours(-5));

    private readonly RepositorioSugerenciasFalso repositorio = new();
    private readonly BuscarSugerencias buscar;

    public BuscarSugerenciasTests()
    {
        buscar = new BuscarSugerencias(repositorio);
    }

    private static BuscarSugerenciasComando Sin(int? limite = null, int? desplazamiento = null) =>
        new(null, null, null, null, limite, desplazamiento);

    private void Cargar(int cantidad)
    {
        for (var i = 0; i < cantidad; i++)
        {
            repositorio.Resultado.Add(new SugerenciaConAutor(
                Guid.NewGuid(), Guid.NewGuid(), $"persona{i}", $"Idea {i}", EstadoSugerencia.Pendiente, Inicio.AddMinutes(-i)));
        }
    }

    [Fact]
    public async Task Sin_filtros_usa_la_pagina_por_defecto()
    {
        Cargar(3);

        var pagina = await buscar.Ejecutar(Sin(), CancellationToken.None);

        Assert.Equal(3, pagina.Sugerencias.Count);
        Assert.False(pagina.HayMas);
        var filtro = repositorio.UltimoFiltro!;
        Assert.Null(filtro.Estado);
        Assert.Null(filtro.NombreDeUsuario);
        Assert.Equal(0, filtro.Desplazamiento);
        Assert.Equal(BuscarSugerencias.LimitePorDefecto + 1, filtro.Limite); // una fila de más para saber si hay otra página
    }

    [Fact]
    public async Task Pasa_los_filtros_de_estado_fecha_y_usuario_normalizando_el_usuario()
    {
        var desde = Inicio.AddDays(-7);

        await buscar.Ejecutar(
            new BuscarSugerenciasComando(EstadoSugerencia.EnRevision, desde, Inicio, "  Ana.L ", 20, 40), CancellationToken.None);

        var filtro = repositorio.UltimoFiltro!;
        Assert.Equal(EstadoSugerencia.EnRevision, filtro.Estado);
        Assert.Equal(desde, filtro.Desde);
        Assert.Equal(Inicio, filtro.Hasta);
        Assert.Equal("ana.l", filtro.NombreDeUsuario);
        Assert.Equal(21, filtro.Limite);
        Assert.Equal(40, filtro.Desplazamiento);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Un_usuario_vacio_significa_sin_filtro(string? usuario)
    {
        await buscar.Ejecutar(new BuscarSugerenciasComando(null, null, null, usuario, null, null), CancellationToken.None);

        Assert.Null(repositorio.UltimoFiltro!.NombreDeUsuario);
    }

    [Fact]
    public async Task Avisa_si_hay_otra_pagina_y_devuelve_solo_el_limite()
    {
        Cargar(6);

        var pagina = await buscar.Ejecutar(Sin(limite: 5), CancellationToken.None);

        Assert.Equal(5, pagina.Sugerencias.Count);
        Assert.True(pagina.HayMas);
    }

    [Fact]
    public async Task En_la_ultima_pagina_no_hay_mas()
    {
        Cargar(6);

        var pagina = await buscar.Ejecutar(Sin(limite: 5, desplazamiento: 5), CancellationToken.None);

        Assert.Single(pagina.Sugerencias);
        Assert.False(pagina.HayMas);
    }

    [Fact]
    public async Task Una_pagina_exacta_no_dice_que_hay_mas()
    {
        Cargar(5);

        var pagina = await buscar.Ejecutar(Sin(limite: 5), CancellationToken.None);

        Assert.Equal(5, pagina.Sugerencias.Count);
        Assert.False(pagina.HayMas);
    }

    [Theory]
    [InlineData(0, null)]
    [InlineData(-1, null)]
    [InlineData(101, null)]
    [InlineData(null, -1)]
    public async Task Rechaza_paginas_fuera_de_rango(int? limite, int? desplazamiento)
    {
        await Assert.ThrowsAsync<ExcepcionDeDominio>(() => buscar.Ejecutar(Sin(limite, desplazamiento), CancellationToken.None));

        Assert.Null(repositorio.UltimoFiltro);
    }

    [Fact]
    public async Task Acepta_el_limite_maximo()
    {
        await buscar.Ejecutar(Sin(limite: BuscarSugerencias.LimiteMaximo), CancellationToken.None);

        Assert.Equal(BuscarSugerencias.LimiteMaximo + 1, repositorio.UltimoFiltro!.Limite);
    }

    [Fact]
    public async Task Rechaza_un_rango_de_fechas_al_reves_o_vacio()
    {
        await Assert.ThrowsAsync<ExcepcionDeDominio>(
            () => buscar.Ejecutar(new BuscarSugerenciasComando(null, Inicio, Inicio.AddDays(-1), null, null, null), CancellationToken.None));
        await Assert.ThrowsAsync<ExcepcionDeDominio>(
            () => buscar.Ejecutar(new BuscarSugerenciasComando(null, Inicio, Inicio, null, null, null), CancellationToken.None));
    }

    [Fact]
    public async Task Rechaza_un_estado_que_no_existe()
    {
        await Assert.ThrowsAsync<ExcepcionDeDominio>(
            () => buscar.Ejecutar(new BuscarSugerenciasComando((EstadoSugerencia)99, null, null, null, null, null), CancellationToken.None));
    }

    [Fact]
    public void La_pagina_no_imprime_los_textos()
    {
        Cargar(2);

        var texto = new PaginaDeSugerencias(repositorio.Resultado, false).ToString();

        Assert.DoesNotContain("Idea", texto, StringComparison.Ordinal);
    }
}
