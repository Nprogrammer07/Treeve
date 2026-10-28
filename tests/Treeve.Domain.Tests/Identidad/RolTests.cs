using Treeve.Domain.Comun;
using Treeve.Domain.Identidad;

namespace Treeve.Domain.Tests.Identidad;

public class RolTests
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 26, 14, 0, 0, TimeSpan.Zero);

    [Theory]
    [InlineData(Rol.Usuario, Rol.Usuario, true)]
    [InlineData(Rol.Usuario, Rol.Staff, false)]
    [InlineData(Rol.Usuario, Rol.Administrador, false)]
    [InlineData(Rol.Staff, Rol.Usuario, true)]
    [InlineData(Rol.Staff, Rol.Staff, true)]
    [InlineData(Rol.Staff, Rol.Administrador, false)]
    [InlineData(Rol.Administrador, Rol.Usuario, true)]
    [InlineData(Rol.Administrador, Rol.Staff, true)]
    [InlineData(Rol.Administrador, Rol.Administrador, true)]
    public void Cada_rol_puede_lo_que_puede_el_anterior(Rol rol, Rol requerido, bool esperado)
    {
        Assert.Equal(esperado, rol.Cumple(requerido));
    }

    [Fact]
    public void Un_valor_que_no_es_un_rol_nunca_cumple()
    {
        Assert.False(((Rol)99).Cumple(Rol.Staff));
        Assert.False(Rol.Administrador.Cumple((Rol)99));
    }

    [Fact]
    public void Toda_persona_se_registra_como_usuario_regular()
    {
        var datos = DatosDeRegistro.Crear("Ana Lopez", "Ani", "ana.l", null, null);

        Assert.Equal(Rol.Usuario, Usuario.Registrar(Guid.NewGuid(), datos, null, Ahora).Rol);
    }

    [Fact]
    public void Cambiar_el_rol_devuelve_el_anterior()
    {
        var datos = DatosDeRegistro.Crear("Ana Lopez", "Ani", "ana.l", null, null);
        var usuario = Usuario.Registrar(Guid.NewGuid(), datos, null, Ahora);

        var anterior = usuario.CambiarRol(Rol.Staff);

        Assert.Equal(Rol.Usuario, anterior);
        Assert.Equal(Rol.Staff, usuario.Rol);
    }

    [Fact]
    public void No_se_puede_asignar_un_rol_inexistente()
    {
        var datos = DatosDeRegistro.Crear("Ana Lopez", "Ani", "ana.l", null, null);
        var usuario = Usuario.Registrar(Guid.NewGuid(), datos, null, Ahora);

        Assert.Throws<ExcepcionDeDominio>(() => usuario.CambiarRol((Rol)99));
        Assert.Equal(Rol.Usuario, usuario.Rol);
    }
}
