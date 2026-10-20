using Treeve.Application.Identidad;

namespace Treeve.Application.Tests.Identidad;

public class IniciarSesionTests
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 15, 20, 0, 0, TimeSpan.Zero);

    private readonly RepositorioUsuariosFalso usuarios = new();
    private readonly RepositorioSesionesFalso sesiones = new();
    private readonly RelojManual reloj = new(Ahora);
    private readonly IniciarSesion iniciarSesion;

    public IniciarSesionTests()
    {
        var hasheador = new HasheadorFalso();
        var abridor = new AbridorDeSesiones(sesiones, new EmisorDeTokensFalso(), reloj);
        var registrar = new RegistrarUsuario(usuarios, hasheador, reloj, abridor);
        iniciarSesion = new IniciarSesion(usuarios, hasheador, reloj, abridor);

        registrar.Ejecutar(
            new RegistrarUsuarioComando("Ana Lopez", "Ani", "ana.l", "Treeve2026", "ana@correo.com", null),
            CancellationToken.None).GetAwaiter().GetResult();
        sesiones.Guardadas.Clear();
    }

    private Task<SesionIniciada> Entrar(string? identificador, string? contrasena) =>
        iniciarSesion.Ejecutar(new IniciarSesionComando(identificador, contrasena), CancellationToken.None);

    private async Task FallarVeces(int veces)
    {
        for (var i = 0; i < veces; i++)
        {
            await Assert.ThrowsAsync<CredencialesInvalidas>(() => Entrar("ana.l", "Incorrecta1"));
        }
    }

    [Fact]
    public async Task Inicia_sesion_con_el_usuario_y_la_contrasena()
    {
        var sesion = await Entrar("ana.l", "Treeve2026");

        Assert.Equal("Ani", sesion.Apodo);
        Assert.Single(sesiones.Guardadas);
    }

    [Fact]
    public async Task Inicia_sesion_con_el_correo_sin_distinguir_mayusculas()
    {
        var sesion = await Entrar("  ANA@correo.com ", "Treeve2026");

        Assert.Equal("Ani", sesion.Apodo);
    }

    [Fact]
    public async Task El_usuario_se_reconoce_sin_distinguir_mayusculas()
    {
        var sesion = await Entrar("ANA.L", "Treeve2026");

        Assert.Equal("Ani", sesion.Apodo);
    }

    [Fact]
    public async Task Una_contrasena_incorrecta_no_abre_sesion()
    {
        await Assert.ThrowsAsync<CredencialesInvalidas>(() => Entrar("ana.l", "Incorrecta1"));

        Assert.Empty(sesiones.Guardadas);
    }

    [Fact]
    public async Task El_mensaje_es_el_mismo_si_el_usuario_no_existe_o_la_contrasena_es_incorrecta()
    {
        var contrasenaMala = await Assert.ThrowsAsync<CredencialesInvalidas>(() => Entrar("ana.l", "Incorrecta1"));
        var usuarioInexistente = await Assert.ThrowsAsync<CredencialesInvalidas>(() => Entrar("nadie", "Treeve2026"));

        Assert.Equal(contrasenaMala.Message, usuarioInexistente.Message);
    }

    [Theory]
    [InlineData(null, null)]
    [InlineData("", "")]
    [InlineData("ana.l", null)]
    public async Task Los_datos_vacios_se_responden_como_credenciales_invalidas(string? identificador, string? contrasena)
    {
        await Assert.ThrowsAsync<CredencialesInvalidas>(() => Entrar(identificador, contrasena));
    }

    [Fact]
    public async Task Una_contrasena_absurdamente_larga_se_rechaza_sin_procesarla()
    {
        await Assert.ThrowsAsync<CredencialesInvalidas>(() => Entrar("ana.l", new string('a', 10_000)));
    }

    [Fact]
    public async Task Cuatro_fallos_seguidos_no_bloquean_y_aun_se_puede_entrar()
    {
        await FallarVeces(4);

        var sesion = await Entrar("ana.l", "Treeve2026");

        Assert.Equal("Ani", sesion.Apodo);
    }

    [Fact]
    public async Task Tras_cinco_fallos_la_cuenta_se_bloquea_aunque_se_use_la_contrasena_correcta()
    {
        await FallarVeces(5);

        var bloqueo = await Assert.ThrowsAsync<CuentaBloqueada>(() => Entrar("ana.l", "Treeve2026"));

        Assert.Equal(TimeSpan.FromMinutes(15), bloqueo.Restante);
        Assert.Empty(sesiones.Guardadas);
    }

    [Fact]
    public async Task El_bloqueo_tambien_aplica_al_entrar_con_el_correo()
    {
        await FallarVeces(5);

        await Assert.ThrowsAsync<CuentaBloqueada>(() => Entrar("ana@correo.com", "Treeve2026"));
    }

    [Fact]
    public async Task Pasados_los_15_minutos_se_puede_volver_a_entrar()
    {
        await FallarVeces(5);
        reloj.Avanzar(TimeSpan.FromMinutes(15));

        var sesion = await Entrar("ana.l", "Treeve2026");

        Assert.Equal("Ani", sesion.Apodo);
    }

    [Fact]
    public async Task Un_acceso_exitoso_reinicia_el_conteo_de_fallos()
    {
        await FallarVeces(4);
        await Entrar("ana.l", "Treeve2026");

        await FallarVeces(4);

        var sesion = await Entrar("ana.l", "Treeve2026");
        Assert.Equal("Ani", sesion.Apodo);
    }

    [Fact]
    public void El_comando_no_imprime_la_contrasena()
    {
        Assert.DoesNotContain("Treeve2026", new IniciarSesionComando("ana.l", "Treeve2026").ToString(), StringComparison.Ordinal);
    }
}
