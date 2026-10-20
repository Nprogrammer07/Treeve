using Treeve.Domain.Identidad;

namespace Treeve.Domain.Tests.Identidad;

public class BloqueoDeCuentaTests
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 15, 20, 0, 0, TimeSpan.Zero);

    private static Credencial NuevaCredencial() => Credencial.Crear(Guid.NewGuid(), "hash", Ahora);

    private static void FallarVeces(Credencial credencial, int veces)
    {
        for (var i = 0; i < veces; i++)
        {
            credencial.RegistrarIntentoFallido(Ahora);
        }
    }

    [Fact]
    public void Una_credencial_nueva_no_esta_bloqueada()
    {
        var credencial = NuevaCredencial();

        Assert.False(credencial.EstaBloqueada(Ahora));
        Assert.Equal(0, credencial.IntentosFallidos);
    }

    [Fact]
    public void Cuatro_intentos_fallidos_no_bloquean_la_cuenta()
    {
        var credencial = NuevaCredencial();

        FallarVeces(credencial, Credencial.MaximoDeIntentosFallidos - 1);

        Assert.False(credencial.EstaBloqueada(Ahora));
        Assert.Equal(4, credencial.IntentosFallidos);
    }

    [Fact]
    public void El_quinto_intento_fallido_bloquea_la_cuenta_por_15_minutos()
    {
        var credencial = NuevaCredencial();

        FallarVeces(credencial, Credencial.MaximoDeIntentosFallidos);

        Assert.True(credencial.EstaBloqueada(Ahora));
        Assert.Equal(Ahora + TimeSpan.FromMinutes(15), credencial.BloqueadoHasta);
        Assert.Equal(TimeSpan.FromMinutes(15), credencial.TiempoDeBloqueoRestante(Ahora));
    }

    [Fact]
    public void El_bloqueo_termina_al_pasar_el_tiempo()
    {
        var credencial = NuevaCredencial();
        FallarVeces(credencial, Credencial.MaximoDeIntentosFallidos);

        Assert.True(credencial.EstaBloqueada(Ahora.AddMinutes(14)));
        Assert.False(credencial.EstaBloqueada(Ahora.AddMinutes(15)));
        Assert.Equal(TimeSpan.Zero, credencial.TiempoDeBloqueoRestante(Ahora.AddMinutes(15)));
    }

    [Fact]
    public void Tras_el_bloqueo_se_vuelven_a_tener_cinco_intentos()
    {
        var credencial = NuevaCredencial();
        FallarVeces(credencial, Credencial.MaximoDeIntentosFallidos);

        Assert.Equal(0, credencial.IntentosFallidos);
    }

    [Fact]
    public void Un_acceso_exitoso_reinicia_los_intentos_consecutivos()
    {
        var credencial = NuevaCredencial();
        FallarVeces(credencial, 4);

        credencial.RegistrarAccesoExitoso(Ahora);
        FallarVeces(credencial, 4);

        Assert.False(credencial.EstaBloqueada(Ahora));
    }

    [Fact]
    public void El_identificador_se_normaliza()
    {
        Assert.Equal("ana@correo.com", Usuario.NormalizarIdentificador("  ANA@Correo.com "));
        Assert.Equal(string.Empty, Usuario.NormalizarIdentificador(null));
    }
}
