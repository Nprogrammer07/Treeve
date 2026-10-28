using Treeve.Application.Comun;
using Treeve.Application.Identidad;
using Treeve.Application.Sugerencias;
using Treeve.Application.Tests.Identidad;
using Treeve.Domain.Comun;
using Treeve.Domain.Identidad;
using Treeve.Domain.Services.Sugerencias;
using Treeve.Domain.Sugerencias;

namespace Treeve.Application.Tests.Sugerencias;

public class BuscarSugerenciasTests
{
    private static readonly DateTimeOffset Inicio = new(2026, 10, 26, 15, 0, 0, TimeSpan.FromHours(-5));

    private static readonly ContextoDeAcceso Contexto = new("203.0.113.7", "GET /api/staff/sugerencias");

    private readonly RepositorioSugerenciasFalso repositorio = new();
    private readonly RepositorioUsuariosFalso usuarios = new();
    private readonly RepositorioAuditoriaFalso auditoria = new();
    private readonly BuscarSugerencias buscar;
    private readonly Guid staffId;

    public BuscarSugerenciasTests()
    {
        buscar = new BuscarSugerencias(
            new AutorizarAcceso(usuarios, auditoria, new RelojManual(Inicio)), repositorio);
        staffId = RegistrarPersona(Rol.Staff).Id;
    }

    private Usuario RegistrarPersona(Rol rol)
    {
        var datos = DatosDeRegistro.Crear("Persona de Prueba", "Pru", $"pru{usuarios.Guardados.Count}", null, null);
        var persona = Usuario.Registrar(Guid.NewGuid(), datos, null, Inicio);
        persona.CambiarRol(rol);
        usuarios.Guardados.Add(persona);
        return persona;
    }

    private Task<PaginaDeSugerencias> Buscar(BuscarSugerenciasComando comando) =>
        buscar.Ejecutar(staffId, Contexto, comando, CancellationToken.None);

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

        var pagina = await Buscar(Sin());

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

        await Buscar(new BuscarSugerenciasComando(EstadoSugerencia.EnRevision, desde, Inicio, "  Ana.L ", 20, 40));

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
        await Buscar(new BuscarSugerenciasComando(null, null, null, usuario, null, null));

        Assert.Null(repositorio.UltimoFiltro!.NombreDeUsuario);
    }

    [Fact]
    public async Task Avisa_si_hay_otra_pagina_y_devuelve_solo_el_limite()
    {
        Cargar(6);

        var pagina = await Buscar(Sin(limite: 5));

        Assert.Equal(5, pagina.Sugerencias.Count);
        Assert.True(pagina.HayMas);
    }

    [Fact]
    public async Task En_la_ultima_pagina_no_hay_mas()
    {
        Cargar(6);

        var pagina = await Buscar(Sin(limite: 5, desplazamiento: 5));

        Assert.Single(pagina.Sugerencias);
        Assert.False(pagina.HayMas);
    }

    [Fact]
    public async Task Una_pagina_exacta_no_dice_que_hay_mas()
    {
        Cargar(5);

        var pagina = await Buscar(Sin(limite: 5));

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
        await Assert.ThrowsAsync<ExcepcionDeDominio>(() => Buscar(Sin(limite, desplazamiento)));

        Assert.Null(repositorio.UltimoFiltro);
    }

    [Fact]
    public async Task Acepta_el_limite_maximo()
    {
        await Buscar(Sin(limite: BuscarSugerencias.LimiteMaximo));

        Assert.Equal(BuscarSugerencias.LimiteMaximo + 1, repositorio.UltimoFiltro!.Limite);
    }

    [Fact]
    public async Task Rechaza_un_rango_de_fechas_al_reves_o_vacio()
    {
        await Assert.ThrowsAsync<ExcepcionDeDominio>(
            () => Buscar(new BuscarSugerenciasComando(null, Inicio, Inicio.AddDays(-1), null, null, null)));
        await Assert.ThrowsAsync<ExcepcionDeDominio>(
            () => Buscar(new BuscarSugerenciasComando(null, Inicio, Inicio, null, null, null)));
    }

    [Fact]
    public async Task Rechaza_un_estado_que_no_existe()
    {
        await Assert.ThrowsAsync<ExcepcionDeDominio>(
            () => Buscar(new BuscarSugerenciasComando((EstadoSugerencia)99, null, null, null, null, null)));
    }

    [Theory]
    [InlineData(Rol.Staff)]
    [InlineData(Rol.Administrador)]
    public async Task Staff_y_administracion_pueden_buscar(Rol rol)
    {
        var persona = RegistrarPersona(rol);
        Cargar(2);

        var pagina = await buscar.Ejecutar(persona.Id, Contexto, Sin(), CancellationToken.None);

        Assert.Equal(2, pagina.Sugerencias.Count);
        Assert.Empty(auditoria.Registrados);
    }

    [Fact]
    public async Task Un_usuario_normal_es_rechazado_auditado_y_no_llega_a_la_base_de_datos()
    {
        var persona = RegistrarPersona(Rol.Usuario);
        Cargar(2);

        await Assert.ThrowsAsync<AccesoDenegado>(
            () => buscar.Ejecutar(persona.Id, Contexto, Sin(), CancellationToken.None));

        Assert.Null(repositorio.UltimoFiltro);
        var registro = Assert.Single(auditoria.Registrados);
        Assert.Equal(persona.Id, registro.UsuarioId);
        Assert.Equal(Rol.Staff, registro.RolRequerido);
        Assert.Equal("GET /api/staff/sugerencias", registro.Recurso);
    }

    [Fact]
    public async Task Una_persona_que_no_existe_es_rechazada()
    {
        await Assert.ThrowsAsync<AccesoDenegado>(
            () => buscar.Ejecutar(Guid.NewGuid(), Contexto, Sin(), CancellationToken.None));

        Assert.Null(repositorio.UltimoFiltro);
    }

    [Fact]
    public async Task Se_autoriza_antes_de_validar_los_filtros()
    {
        var persona = RegistrarPersona(Rol.Usuario);

        // Con filtros inválidos, quien no es staff recibe 403 y no el detalle de la validación.
        await Assert.ThrowsAsync<AccesoDenegado>(
            () => buscar.Ejecutar(persona.Id, Contexto, Sin(limite: 0), CancellationToken.None));
    }

    [Fact]
    public void La_pagina_no_imprime_los_textos()
    {
        Cargar(2);

        var texto = new PaginaDeSugerencias(repositorio.Resultado, false).ToString();

        Assert.DoesNotContain("Idea", texto, StringComparison.Ordinal);
    }
}
