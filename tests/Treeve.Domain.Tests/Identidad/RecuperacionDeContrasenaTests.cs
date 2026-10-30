using Treeve.Domain.Identidad;

namespace Treeve.Domain.Tests.Identidad;

public class RecuperacionDeContrasenaTests
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 29, 9, 0, 0, TimeSpan.FromHours(-5));

    private static RecuperacionDeContrasena Nueva() => RecuperacionDeContrasena.Emitir(Guid.NewGuid(), "hash-del-token", Ahora);

    [Fact]
    public void Una_recuperacion_nueva_esta_vigente_y_vence_a_los_30_minutos()
    {
        var recuperacion = Nueva();

        Assert.True(recuperacion.EstaVigente(Ahora));
        Assert.Equal(Ahora + TimeSpan.FromMinutes(30), recuperacion.ExpiraEn);
        Assert.Null(recuperacion.UsadaEn);
    }

    [Fact]
    public void Deja_de_estar_vigente_al_llegar_la_hora_de_vencimiento()
    {
        var recuperacion = Nueva();

        Assert.True(recuperacion.EstaVigente(recuperacion.ExpiraEn - TimeSpan.FromSeconds(1)));
        Assert.False(recuperacion.EstaVigente(recuperacion.ExpiraEn));
    }

    [Fact]
    public void Una_vez_usada_no_esta_vigente()
    {
        var recuperacion = Nueva();

        recuperacion.MarcarComoUsada(Ahora.AddMinutes(1));

        Assert.False(recuperacion.EstaVigente(Ahora.AddMinutes(2)));
        Assert.Equal(Ahora.AddMinutes(1), recuperacion.UsadaEn);
    }

    [Fact]
    public void Usarla_dos_veces_conserva_la_primera_fecha()
    {
        var recuperacion = Nueva();

        recuperacion.MarcarComoUsada(Ahora.AddMinutes(1));
        recuperacion.MarcarComoUsada(Ahora.AddMinutes(5));

        Assert.Equal(Ahora.AddMinutes(1), recuperacion.UsadaEn);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    public void Exige_el_hash_del_token(string? hash)
    {
        Assert.ThrowsAny<ArgumentException>(() => RecuperacionDeContrasena.Emitir(Guid.NewGuid(), hash!, Ahora));
    }

    [Fact]
    public void No_imprime_el_hash_del_token()
    {
        Assert.DoesNotContain("hash-del-token", Nueva().ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public void Cambiar_la_contrasena_levanta_el_bloqueo_y_borra_los_intentos()
    {
        var credencial = Credencial.Crear(Guid.NewGuid(), "hash-viejo", Ahora);
        for (var i = 0; i < Credencial.MaximoDeIntentosFallidos; i++)
        {
            credencial.RegistrarIntentoFallido(Ahora);
        }

        Assert.True(credencial.EstaBloqueada(Ahora));

        credencial.CambiarContrasena("hash-nuevo", Ahora.AddMinutes(1));

        Assert.Equal("hash-nuevo", credencial.HashDeContrasena);
        Assert.False(credencial.EstaBloqueada(Ahora.AddMinutes(1)));
        Assert.Equal(0, credencial.IntentosFallidos);
        Assert.Equal(Ahora.AddMinutes(1), credencial.ActualizadaEn);
    }

    [Fact]
    public void Cambiar_la_contrasena_exige_un_hash()
    {
        var credencial = Credencial.Crear(Guid.NewGuid(), "hash-viejo", Ahora);

        Assert.ThrowsAny<ArgumentException>(() => credencial.CambiarContrasena(" ", Ahora));
    }
}
