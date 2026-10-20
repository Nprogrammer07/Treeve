using Treeve.Application.Identidad;
using Treeve.Domain.Comun;

namespace Treeve.Application.Tests.Identidad;

public class RegistrarUsuarioTests
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 15, 20, 0, 0, TimeSpan.Zero);

    private readonly RepositorioUsuariosFalso usuarios = new();
    private readonly RepositorioSesionesFalso sesiones = new();
    private readonly RegistrarUsuario registrar;

    public RegistrarUsuarioTests()
    {
        var reloj = new RelojManual(Ahora);
        var abridor = new AbridorDeSesiones(sesiones, new EmisorDeTokensFalso(), reloj);
        registrar = new RegistrarUsuario(usuarios, new HasheadorFalso(), reloj, abridor);
    }

    private static RegistrarUsuarioComando Comando(
        string? usuario = "ana.l",
        string? contrasena = "Treeve2026",
        string? correo = null) =>
        new("Ana Lopez", "Ani", usuario, contrasena, correo, null);

    [Fact]
    public async Task Registra_al_usuario_y_abre_la_sesion_automaticamente()
    {
        var sesion = await registrar.Ejecutar(Comando(), CancellationToken.None);

        var usuario = Assert.Single(usuarios.Guardados);
        Assert.Equal(usuario.Id, sesion.UsuarioId);
        Assert.Equal("Ani", sesion.Apodo);
        Assert.Equal("token-1", sesion.Token);
        Assert.Single(sesiones.Guardadas);
        Assert.Equal(Ahora + AbridorDeSesiones.DuracionDeSesion, sesion.ExpiraEn);
    }

    [Fact]
    public async Task Guarda_el_hash_y_nunca_la_contrasena()
    {
        await registrar.Ejecutar(Comando(contrasena: "Treeve2026"), CancellationToken.None);

        var usuario = Assert.Single(usuarios.Guardados);
        Assert.NotEqual("Treeve2026", usuario.HashDeContrasena);
        Assert.Equal("hash:Treeve2026", usuario.HashDeContrasena);
    }

    [Fact]
    public async Task Rechaza_una_contrasena_que_no_cumple_la_politica_y_no_guarda_nada()
    {
        await Assert.ThrowsAsync<ExcepcionDeDominio>(() => registrar.Ejecutar(Comando(contrasena: "corta1"), CancellationToken.None));

        Assert.Empty(usuarios.Guardados);
        Assert.Empty(sesiones.Guardadas);
    }

    [Fact]
    public async Task El_correo_es_opcional()
    {
        await registrar.Ejecutar(Comando(correo: null), CancellationToken.None);

        Assert.Null(Assert.Single(usuarios.Guardados).Correo);
    }

    [Fact]
    public async Task Rechaza_un_usuario_repetido_sin_distinguir_mayusculas()
    {
        await registrar.Ejecutar(Comando(usuario: "ana.l"), CancellationToken.None);

        await Assert.ThrowsAsync<ExcepcionDeDominio>(() => registrar.Ejecutar(Comando(usuario: "ANA.L"), CancellationToken.None));
        Assert.Single(usuarios.Guardados);
    }

    [Fact]
    public async Task Rechaza_un_correo_repetido()
    {
        await registrar.Ejecutar(Comando(usuario: "ana.l", correo: "ana@correo.com"), CancellationToken.None);

        await Assert.ThrowsAsync<ExcepcionDeDominio>(
            () => registrar.Ejecutar(Comando(usuario: "otra.ana", correo: "ANA@correo.com"), CancellationToken.None));
    }

    [Fact]
    public void El_comando_no_imprime_la_contrasena()
    {
        Assert.DoesNotContain("Treeve2026", Comando().ToString(), StringComparison.Ordinal);
    }
}
