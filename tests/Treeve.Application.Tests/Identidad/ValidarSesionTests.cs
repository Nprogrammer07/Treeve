using Treeve.Application.Identidad;

namespace Treeve.Application.Tests.Identidad;

public class ValidarSesionTests
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 15, 20, 0, 0, TimeSpan.Zero);

    private readonly RepositorioUsuariosFalso usuarios = new();
    private readonly RepositorioSesionesFalso sesiones = new();
    private readonly RelojManual reloj = new(Ahora);
    private readonly RegistrarUsuario registrar;
    private readonly ValidarSesion validar;

    public ValidarSesionTests()
    {
        var tokens = new EmisorDeTokensFalso();
        registrar = new RegistrarUsuario(usuarios, new HasheadorFalso(), reloj, new AbridorDeSesiones(sesiones, tokens, reloj));
        validar = new ValidarSesion(sesiones, tokens, reloj);
    }

    [Fact]
    public async Task Un_token_valido_devuelve_el_usuario_de_la_sesion()
    {
        var sesion = await registrar.Ejecutar(
            new RegistrarUsuarioComando("Ana Lopez", "Ani", "ana.l", "Treeve2026", null, null), CancellationToken.None);

        var usuarioId = await validar.Ejecutar(sesion.Token, CancellationToken.None);

        Assert.Equal(sesion.UsuarioId, usuarioId);
    }

    [Fact]
    public async Task Un_token_vencido_no_es_valido()
    {
        var sesion = await registrar.Ejecutar(
            new RegistrarUsuarioComando("Ana Lopez", "Ani", "ana.l", "Treeve2026", null, null), CancellationToken.None);
        reloj.Avanzar(AbridorDeSesiones.DuracionDeSesion);

        Assert.Null(await validar.Ejecutar(sesion.Token, CancellationToken.None));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("token-inventado")]
    public async Task Un_token_ausente_o_desconocido_no_es_valido(string? token)
    {
        Assert.Null(await validar.Ejecutar(token, CancellationToken.None));
    }
}
