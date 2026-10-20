using Treeve.Domain.Comun;
using Treeve.Domain.Identidad;

namespace Treeve.Domain.Tests.Identidad;

public class ReglasDeIdentidadTests
{
    [Fact]
    public void El_usuario_se_guarda_en_minusculas_y_sin_espacios()
    {
        Assert.Equal("ana.lopez", ReglasDeIdentidad.NombreDeUsuario("  Ana.Lopez "));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("ab")]
    [InlineData("con espacios")]
    [InlineData("raro@usuario")]
    public void Rechaza_usuarios_invalidos(string? usuario)
    {
        Assert.Throws<ExcepcionDeDominio>(() => ReglasDeIdentidad.NombreDeUsuario(usuario));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void El_correo_es_opcional(string? correo)
    {
        Assert.Null(ReglasDeIdentidad.Correo(correo));
    }

    [Fact]
    public void El_correo_se_normaliza_a_minusculas()
    {
        Assert.Equal("ana@correo.com", ReglasDeIdentidad.Correo(" Ana@Correo.COM "));
    }

    [Theory]
    [InlineData("sin-arroba")]
    [InlineData("a@b")]
    [InlineData("dos@@correo.com")]
    public void Rechaza_correos_con_formato_invalido(string correo)
    {
        Assert.Throws<ExcepcionDeDominio>(() => ReglasDeIdentidad.Correo(correo));
    }

    [Fact]
    public void El_motivo_es_opcional_y_tiene_limite()
    {
        Assert.Null(ReglasDeIdentidad.Motivo("  "));
        Assert.Throws<ExcepcionDeDominio>(() => ReglasDeIdentidad.Motivo(new string('a', ReglasDeIdentidad.MotivoMaximo + 1)));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("A")]
    public void El_nombre_completo_y_el_apodo_son_obligatorios(string? texto)
    {
        Assert.Throws<ExcepcionDeDominio>(() => ReglasDeIdentidad.NombreCompleto(texto));
        Assert.Throws<ExcepcionDeDominio>(() => ReglasDeIdentidad.Apodo(texto));
    }
}
