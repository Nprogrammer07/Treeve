using Treeve.Application.Identidad;
using Treeve.Domain.Comun;
using Treeve.Domain.Identidad;

namespace Treeve.Application.Tests.Identidad;

public class SolicitarRecuperacionTests
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 29, 9, 0, 0, TimeSpan.FromHours(-5));

    private readonly RepositorioUsuariosFalso usuarios = new();
    private readonly RepositorioRecuperacionesFalso recuperaciones = new();
    private readonly NotificadorDeRecuperacionFalso notificador = new();
    private readonly RelojManual reloj = new(Ahora);
    private readonly SolicitarRecuperacion solicitar;

    public SolicitarRecuperacionTests()
    {
        solicitar = new SolicitarRecuperacion(usuarios, recuperaciones, new EmisorDeTokensFalso(), notificador, reloj);

        Registrar("ana.l", "ana@correo.com");
        Registrar("sin.correo", null);
    }

    private void Registrar(string nombreDeUsuario, string? correo)
    {
        var datos = DatosDeRegistro.Crear("Ana Lopez", "Ani", nombreDeUsuario, correo, null);
        usuarios.Guardados.Add(Usuario.Registrar(Guid.NewGuid(), datos, null, Ahora));
    }

    private Task Pedir(string? correo) => solicitar.Ejecutar(new SolicitarRecuperacionComando(correo), CancellationToken.None);

    [Fact]
    public async Task Envia_el_enlace_al_correo_registrado()
    {
        await Pedir("ana@correo.com");

        var envio = Assert.Single(notificador.Enviados);
        Assert.Equal("ana@correo.com", envio.Correo);
        Assert.Equal("Ani", envio.Apodo);
        Assert.Equal(Ahora + RecuperacionDeContrasena.Vigencia, envio.ExpiraEn);
        Assert.Single(recuperaciones.Guardadas);
    }

    [Fact]
    public async Task Solo_guarda_el_hash_del_token_no_el_token()
    {
        await Pedir("ana@correo.com");

        var envio = Assert.Single(notificador.Enviados);
        var guardada = Assert.Single(recuperaciones.Guardadas);
        Assert.NotEqual(envio.Token, guardada.TokenHash);
        Assert.Equal($"h({envio.Token})", guardada.TokenHash);
    }

    [Theory]
    [InlineData("  ANA@Correo.com ")]
    [InlineData("ana@correo.com")]
    public async Task El_correo_se_busca_sin_distinguir_mayusculas_ni_espacios(string escrito)
    {
        await Pedir(escrito);

        Assert.Single(notificador.Enviados);
    }

    [Fact]
    public async Task Un_correo_no_registrado_termina_igual_pero_no_envia_ni_guarda_nada()
    {
        await Pedir("nadie@correo.com");

        Assert.Empty(notificador.Enviados);
        Assert.Empty(recuperaciones.Guardadas);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("no-es-un-correo")]
    public async Task Rechaza_un_texto_que_no_es_un_correo(string? correo)
    {
        await Assert.ThrowsAsync<ExcepcionDeDominio>(() => Pedir(correo));

        Assert.Empty(notificador.Enviados);
    }

    [Fact]
    public async Task Una_segunda_solicitud_inmediata_no_envia_otro_correo()
    {
        await Pedir("ana@correo.com");
        reloj.Avanzar(TimeSpan.FromSeconds(30));

        await Pedir("ana@correo.com");

        Assert.Single(notificador.Enviados);
        Assert.Single(recuperaciones.Guardadas);
    }

    [Fact]
    public async Task Pasada_la_espera_un_enlace_nuevo_reemplaza_al_anterior()
    {
        await Pedir("ana@correo.com");
        reloj.Avanzar(RecuperacionDeContrasena.EsperaEntreSolicitudes + TimeSpan.FromSeconds(1));

        await Pedir("ana@correo.com");

        Assert.Equal(2, notificador.Enviados.Count);
        var vigentes = recuperaciones.Guardadas.Where(r => r.EstaVigente(reloj.Ahora)).ToList();
        Assert.Single(vigentes);
        Assert.Equal($"h({notificador.Enviados[1].Token})", vigentes[0].TokenHash);
    }

    [Fact]
    public async Task Si_el_correo_no_sale_la_respuesta_es_la_misma()
    {
        notificador.Falla = true;

        await Pedir("ana@correo.com");

        Assert.Empty(notificador.Enviados);
    }

    [Fact]
    public void El_comando_no_imprime_el_correo()
    {
        Assert.DoesNotContain("ana@correo.com", new SolicitarRecuperacionComando("ana@correo.com").ToString(), StringComparison.Ordinal);
    }
}
