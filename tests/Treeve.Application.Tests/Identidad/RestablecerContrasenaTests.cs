using Treeve.Application.Identidad;
using Treeve.Domain.Comun;
using Treeve.Domain.Identidad;

namespace Treeve.Application.Tests.Identidad;

public class RestablecerContrasenaTests
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 29, 9, 0, 0, TimeSpan.FromHours(-5));

    private readonly RepositorioUsuariosFalso usuarios = new();
    private readonly RepositorioRecuperacionesFalso recuperaciones = new();
    private readonly RepositorioSesionesFalso sesiones = new();
    private readonly NotificadorDeRecuperacionFalso notificador = new();
    private readonly RelojManual reloj = new(Ahora);
    private readonly IniciarSesion iniciarSesion;
    private readonly RestablecerContrasena restablecer;
    private readonly SolicitarRecuperacion solicitar;

    public RestablecerContrasenaTests()
    {
        var hasheador = new HasheadorFalso();
        var tokens = new EmisorDeTokensFalso();
        var abridor = new AbridorDeSesiones(sesiones, tokens, reloj);
        var credenciales = new RepositorioCredencialesFalso(usuarios);

        var registrar = new RegistrarUsuario(usuarios, hasheador, new CifradorFalso(), reloj, abridor);
        iniciarSesion = new IniciarSesion(credenciales, usuarios, hasheador, reloj, abridor);
        solicitar = new SolicitarRecuperacion(usuarios, recuperaciones, tokens, notificador, reloj);
        restablecer = new RestablecerContrasena(recuperaciones, credenciales, sesiones, hasheador, tokens, reloj);

        registrar.Ejecutar(
            new RegistrarUsuarioComando("Ana Lopez", "Ani", "ana.l", "Treeve2026", "ana@correo.com", null),
            CancellationToken.None).GetAwaiter().GetResult();
    }

    private async Task<string> PedirEnlace()
    {
        await solicitar.Ejecutar(new SolicitarRecuperacionComando("ana@correo.com"), CancellationToken.None);
        return notificador.Enviados[^1].Token;
    }

    private Task Restablecer(string? token, string? contrasena) =>
        restablecer.Ejecutar(new RestablecerContrasenaComando(token, contrasena), CancellationToken.None);

    private Task<SesionIniciada> Entrar(string contrasena) =>
        iniciarSesion.Ejecutar(new IniciarSesionComando("ana.l", contrasena), CancellationToken.None);

    [Fact]
    public async Task Con_el_enlace_la_contrasena_nueva_sirve_y_la_vieja_no()
    {
        var token = await PedirEnlace();

        await Restablecer(token, "NuevaClave2026");

        Assert.NotNull(await Entrar("NuevaClave2026"));
        await Assert.ThrowsAsync<CredencialesInvalidas>(() => Entrar("Treeve2026"));
    }

    [Fact]
    public async Task El_enlace_es_de_un_solo_uso()
    {
        var token = await PedirEnlace();
        await Restablecer(token, "NuevaClave2026");

        await Assert.ThrowsAsync<TokenDeRecuperacionInvalido>(() => Restablecer(token, "OtraClave2026"));

        Assert.NotNull(await Entrar("NuevaClave2026"));
    }

    [Fact]
    public async Task El_enlace_vence_a_los_30_minutos()
    {
        var token = await PedirEnlace();
        reloj.Avanzar(RecuperacionDeContrasena.Vigencia + TimeSpan.FromSeconds(1));

        await Assert.ThrowsAsync<TokenDeRecuperacionInvalido>(() => Restablecer(token, "NuevaClave2026"));

        Assert.NotNull(await Entrar("Treeve2026"));
    }

    [Fact]
    public async Task El_enlace_sirve_justo_antes_de_vencer()
    {
        var token = await PedirEnlace();
        reloj.Avanzar(RecuperacionDeContrasena.Vigencia - TimeSpan.FromSeconds(1));

        await Restablecer(token, "NuevaClave2026");

        Assert.NotNull(await Entrar("NuevaClave2026"));
    }

    [Fact]
    public async Task Un_enlace_viejo_deja_de_servir_cuando_se_pide_uno_nuevo()
    {
        var viejo = await PedirEnlace();
        reloj.Avanzar(RecuperacionDeContrasena.EsperaEntreSolicitudes + TimeSpan.FromSeconds(1));
        var nuevo = await PedirEnlace();

        await Assert.ThrowsAsync<TokenDeRecuperacionInvalido>(() => Restablecer(viejo, "NuevaClave2026"));
        await Restablecer(nuevo, "NuevaClave2026");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("token-que-no-existe")]
    public async Task Un_token_que_no_existe_se_rechaza_con_el_mismo_error(string? token)
    {
        await PedirEnlace();

        await Assert.ThrowsAsync<TokenDeRecuperacionInvalido>(() => Restablecer(token, "NuevaClave2026"));
    }

    [Fact]
    public async Task Un_token_enorme_se_rechaza_sin_consultar()
    {
        await Assert.ThrowsAsync<TokenDeRecuperacionInvalido>(() => Restablecer(new string('a', 10_000), "NuevaClave2026"));
    }

    [Theory]
    [InlineData("corta1")]
    [InlineData("sinnumeroaqui")]
    [InlineData("123456789")]
    [InlineData(null)]
    public async Task Una_contrasena_que_no_cumple_la_politica_no_gasta_el_enlace(string? contrasena)
    {
        var token = await PedirEnlace();

        await Assert.ThrowsAsync<ExcepcionDeDominio>(() => Restablecer(token, contrasena));

        await Restablecer(token, "NuevaClave2026"); // el mismo enlace sigue sirviendo
    }

    [Fact]
    public async Task Cierra_las_sesiones_abiertas_de_la_persona()
    {
        var anterior = await Entrar("Treeve2026");
        var token = await PedirEnlace();

        await Restablecer(token, "NuevaClave2026");

        Assert.NotEmpty(anterior.Token);
        Assert.Empty(sesiones.Guardadas);
    }

    [Fact]
    public async Task Levanta_el_bloqueo_por_intentos_fallidos()
    {
        for (var i = 0; i < Credencial.MaximoDeIntentosFallidos; i++)
        {
            await Assert.ThrowsAsync<CredencialesInvalidas>(() => Entrar("Incorrecta1"));
        }

        await Assert.ThrowsAsync<CuentaBloqueada>(() => Entrar("Treeve2026"));

        var token = await PedirEnlace();
        await Restablecer(token, "NuevaClave2026");

        Assert.NotNull(await Entrar("NuevaClave2026"));
    }

    [Fact]
    public async Task La_contrasena_nueva_no_queda_en_claro()
    {
        var token = await PedirEnlace();

        await Restablecer(token, "NuevaClave2026");

        Assert.Equal("hash:NuevaClave2026", usuarios.Credenciales[0].HashDeContrasena);
        Assert.DoesNotContain("NuevaClave2026", new RestablecerContrasenaComando(token, "NuevaClave2026").ToString(), StringComparison.Ordinal);
    }
}
