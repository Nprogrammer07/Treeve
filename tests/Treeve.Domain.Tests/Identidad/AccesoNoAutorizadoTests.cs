using Treeve.Domain.Identidad;

namespace Treeve.Domain.Tests.Identidad;

public class AccesoNoAutorizadoTests
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 26, 14, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Guarda_quien_cuando_desde_donde_y_a_que_ruta()
    {
        var usuarioId = Guid.NewGuid();

        var acceso = AccesoNoAutorizado.Registrar(usuarioId, " 203.0.113.7 ", "GET /api/staff/acceso", Rol.Staff, Ahora);

        Assert.Equal(usuarioId, acceso.UsuarioId);
        Assert.Equal(Ahora, acceso.OcurrioEn);
        Assert.Equal("203.0.113.7", acceso.Ip);
        Assert.Equal("GET /api/staff/acceso", acceso.Recurso);
        Assert.Equal(Rol.Staff, acceso.RolRequerido);
        Assert.NotEqual(Guid.Empty, acceso.Id);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Sin_ip_queda_como_desconocida(string? ip)
    {
        var acceso = AccesoNoAutorizado.Registrar(Guid.NewGuid(), ip, "GET /api/staff/acceso", Rol.Staff, Ahora);

        Assert.Equal(AccesoNoAutorizado.IpDesconocida, acceso.Ip);
    }

    [Fact]
    public void Los_textos_largos_se_recortan_para_caber_en_la_tabla()
    {
        var acceso = AccesoNoAutorizado.Registrar(
            Guid.NewGuid(), new string('9', 100), "GET /" + new string('a', 500), Rol.Staff, Ahora);

        Assert.Equal(AccesoNoAutorizado.IpMaxima, acceso.Ip.Length);
        Assert.Equal(AccesoNoAutorizado.RecursoMaximo, acceso.Recurso.Length);
    }

    [Fact]
    public void Sin_ruta_no_hay_registro()
    {
        Assert.ThrowsAny<ArgumentException>(
            () => AccesoNoAutorizado.Registrar(Guid.NewGuid(), "203.0.113.7", " ", Rol.Staff, Ahora));
    }

    [Fact]
    public void No_imprime_la_ip()
    {
        var acceso = AccesoNoAutorizado.Registrar(Guid.NewGuid(), "203.0.113.7", "GET /api/staff/acceso", Rol.Staff, Ahora);

        Assert.DoesNotContain("203.0.113.7", acceso.ToString(), StringComparison.Ordinal);
    }
}
