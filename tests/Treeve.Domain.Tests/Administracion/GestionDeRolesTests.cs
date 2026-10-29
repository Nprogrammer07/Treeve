using Treeve.Domain.Administracion;
using Treeve.Domain.Comun;
using Treeve.Domain.Identidad;

namespace Treeve.Domain.Tests.Administracion;

public class GestionDeRolesTests
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 27, 20, 0, 0, TimeSpan.FromHours(-5));

    private static Usuario Persona(Rol rol)
    {
        var datos = DatosDeRegistro.Crear("Ana Lopez", "Ani", "ana.l", null, null);
        var usuario = Usuario.Registrar(Guid.NewGuid(), datos, null, Ahora);
        usuario.CambiarRol(rol);
        return usuario;
    }

    [Fact]
    public void Un_usuario_regular_puede_pasar_a_staff_y_volver()
    {
        var usuario = Persona(Rol.Usuario);

        Assert.Equal(Rol.Usuario, usuario.AscenderAStaff());
        Assert.Equal(Rol.Staff, usuario.Rol);
        Assert.Equal(Rol.Staff, usuario.RevocarStaff());
        Assert.Equal(Rol.Usuario, usuario.Rol);
    }

    [Theory]
    [InlineData(Rol.Staff)]
    [InlineData(Rol.Administrador)]
    public void Solo_se_asciende_a_un_usuario_regular(Rol rol)
    {
        var usuario = Persona(rol);

        Assert.Throws<ExcepcionDeDominio>(() => usuario.AscenderAStaff());
        Assert.Equal(rol, usuario.Rol);
    }

    [Theory]
    [InlineData(Rol.Usuario)]
    [InlineData(Rol.Administrador)]
    public void Solo_se_le_revoca_el_rol_a_alguien_del_staff(Rol rol)
    {
        var usuario = Persona(rol);

        Assert.Throws<ExcepcionDeDominio>(() => usuario.RevocarStaff());
        Assert.Equal(rol, usuario.Rol);
    }

    [Fact]
    public void El_registro_guarda_quien_a_quien_de_que_rol_a_cual_y_cuando()
    {
        var administrador = Guid.NewGuid();
        var persona = Guid.NewGuid();

        var cambio = CambioDeRol.Registrar(administrador, persona, Rol.Usuario, Rol.Staff, Ahora);

        Assert.Equal(administrador, cambio.AdministradorId);
        Assert.Equal(persona, cambio.UsuarioAfectadoId);
        Assert.Equal((Rol.Usuario, Rol.Staff), (cambio.RolAnterior, cambio.RolNuevo));
        Assert.Equal(Ahora, cambio.OcurrioEn);
    }

    [Fact]
    public void Un_administrador_no_puede_cambiar_su_propio_rol()
    {
        var administrador = Guid.NewGuid();

        Assert.Throws<ExcepcionDeDominio>(() => CambioDeRol.Registrar(administrador, administrador, Rol.Administrador, Rol.Usuario, Ahora));
    }

    [Theory]
    [InlineData(Rol.Staff, Rol.Staff)]
    [InlineData((Rol)99, Rol.Staff)]
    public void Un_cambio_sin_cambio_o_con_un_rol_inexistente_no_se_registra(Rol anterior, Rol nuevo)
    {
        Assert.Throws<ExcepcionDeDominio>(() => CambioDeRol.Registrar(Guid.NewGuid(), Guid.NewGuid(), anterior, nuevo, Ahora));
    }

    [Fact]
    public void El_evento_lleva_el_id_del_registro_y_solo_metadatos()
    {
        var cambio = CambioDeRol.Registrar(Guid.NewGuid(), Guid.NewGuid(), Rol.Staff, Rol.Usuario, Ahora);

        Assert.Equal(new RolCambiado(cambio.Id, cambio.UsuarioAfectadoId, Rol.Staff, Rol.Usuario, Ahora), cambio.Evento());
    }
}
