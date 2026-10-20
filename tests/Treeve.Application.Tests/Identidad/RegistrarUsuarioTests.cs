using Treeve.Application.Identidad;
using Treeve.Domain.Comun;

namespace Treeve.Application.Tests.Identidad;

public class RegistrarUsuarioTests
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 15, 20, 0, 0, TimeSpan.Zero);

    private readonly RepositorioUsuariosFalso usuarios = new();
    private readonly RepositorioSesionesFalso sesiones = new();
    private readonly CifradorFalso cifrador = new();
    private readonly RegistrarUsuario registrar;

    public RegistrarUsuarioTests()
    {
        var reloj = new RelojManual(Ahora);
        var abridor = new AbridorDeSesiones(sesiones, new EmisorDeTokensFalso(), reloj);
        registrar = new RegistrarUsuario(usuarios, new HasheadorFalso(), cifrador, reloj, abridor);
    }

    private static RegistrarUsuarioComando Comando(
        string? usuario = "ana.l",
        string? contrasena = "Treeve2026",
        string? correo = null,
        string? motivo = null) =>
        new("Ana Lopez", "Ani", usuario, contrasena, correo, motivo);

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

        var credencial = Assert.Single(usuarios.Credenciales);
        Assert.NotEqual("Treeve2026", credencial.HashDeContrasena);
        Assert.Equal("hash:Treeve2026", credencial.HashDeContrasena);
    }

    [Fact]
    public async Task La_credencial_se_guarda_aparte_y_atada_al_usuario()
    {
        await registrar.Ejecutar(Comando(), CancellationToken.None);

        var usuario = Assert.Single(usuarios.Guardados);
        var credencial = Assert.Single(usuarios.Credenciales);
        Assert.Equal(usuario.Id, credencial.UsuarioId);
        Assert.Equal(0, credencial.IntentosFallidos);
        Assert.Null(credencial.BloqueadoHasta);
    }

    [Fact]
    public async Task El_motivo_se_guarda_cifrado_y_atado_a_su_usuario()
    {
        await registrar.Ejecutar(Comando(motivo: "Quiero un espacio para mí"), CancellationToken.None);

        var usuario = Assert.Single(usuarios.Guardados);
        Assert.NotNull(usuario.MotivoDeRegistroCifrado);
        Assert.DoesNotContain("Quiero un espacio", System.Text.Encoding.UTF8.GetString(usuario.MotivoDeRegistroCifrado), StringComparison.Ordinal);
        Assert.Equal(
            "Quiero un espacio para mí",
            cifrador.Descifrar(usuario.MotivoDeRegistroCifrado, RegistrarUsuario.ContextoDelMotivo(usuario.Id)));
    }

    [Fact]
    public async Task Sin_motivo_no_se_guarda_nada_cifrado()
    {
        await registrar.Ejecutar(Comando(motivo: "   "), CancellationToken.None);

        Assert.Null(Assert.Single(usuarios.Guardados).MotivoDeRegistroCifrado);
    }

    [Fact]
    public async Task Rechaza_una_contrasena_que_no_cumple_la_politica_y_no_guarda_nada()
    {
        await Assert.ThrowsAsync<ExcepcionDeDominio>(() => registrar.Ejecutar(Comando(contrasena: "corta1"), CancellationToken.None));

        Assert.Empty(usuarios.Guardados);
        Assert.Empty(usuarios.Credenciales);
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
