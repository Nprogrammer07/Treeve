using Treeve.Domain.Identidad;

namespace Treeve.Domain.Tests.Identidad;

public class BloqueoDeCuentaTests
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 15, 20, 0, 0, TimeSpan.Zero);

    private static Usuario NuevoUsuario() =>
        Usuario.Registrar(DatosDeRegistro.Crear("Ana Lopez", "Ani", "ana.l", null, null), "hash", Ahora);

    private static void FallarVeces(Usuario usuario, int veces)
    {
        for (var i = 0; i < veces; i++)
        {
            usuario.RegistrarIntentoFallido(Ahora);
        }
    }

    [Fact]
    public void Un_usuario_nuevo_no_esta_bloqueado()
    {
        var usuario = NuevoUsuario();

        Assert.False(usuario.EstaBloqueado(Ahora));
        Assert.Equal(0, usuario.IntentosFallidos);
    }

    [Fact]
    public void Cuatro_intentos_fallidos_no_bloquean_la_cuenta()
    {
        var usuario = NuevoUsuario();

        FallarVeces(usuario, Usuario.MaximoDeIntentosFallidos - 1);

        Assert.False(usuario.EstaBloqueado(Ahora));
        Assert.Equal(4, usuario.IntentosFallidos);
    }

    [Fact]
    public void El_quinto_intento_fallido_bloquea_la_cuenta_por_15_minutos()
    {
        var usuario = NuevoUsuario();

        FallarVeces(usuario, Usuario.MaximoDeIntentosFallidos);

        Assert.True(usuario.EstaBloqueado(Ahora));
        Assert.Equal(Ahora + TimeSpan.FromMinutes(15), usuario.BloqueadoHasta);
        Assert.Equal(TimeSpan.FromMinutes(15), usuario.TiempoDeBloqueoRestante(Ahora));
    }

    [Fact]
    public void El_bloqueo_termina_al_pasar_el_tiempo()
    {
        var usuario = NuevoUsuario();
        FallarVeces(usuario, Usuario.MaximoDeIntentosFallidos);

        Assert.True(usuario.EstaBloqueado(Ahora.AddMinutes(14)));
        Assert.False(usuario.EstaBloqueado(Ahora.AddMinutes(15)));
        Assert.Equal(TimeSpan.Zero, usuario.TiempoDeBloqueoRestante(Ahora.AddMinutes(15)));
    }

    [Fact]
    public void Tras_el_bloqueo_se_vuelven_a_tener_cinco_intentos()
    {
        var usuario = NuevoUsuario();
        FallarVeces(usuario, Usuario.MaximoDeIntentosFallidos);

        Assert.Equal(0, usuario.IntentosFallidos);
    }

    [Fact]
    public void Un_acceso_exitoso_reinicia_los_intentos_consecutivos()
    {
        var usuario = NuevoUsuario();
        FallarVeces(usuario, 4);

        usuario.RegistrarAccesoExitoso();
        FallarVeces(usuario, 4);

        Assert.False(usuario.EstaBloqueado(Ahora));
    }

    [Fact]
    public void El_identificador_se_normaliza()
    {
        Assert.Equal("ana@correo.com", Usuario.NormalizarIdentificador("  ANA@Correo.com "));
        Assert.Equal(string.Empty, Usuario.NormalizarIdentificador(null));
    }
}
