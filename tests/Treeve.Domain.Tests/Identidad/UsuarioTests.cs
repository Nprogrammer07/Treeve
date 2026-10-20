using Treeve.Domain.Identidad;

namespace Treeve.Domain.Tests.Identidad;

public class UsuarioTests
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 15, 20, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Registrar_crea_un_usuario_con_los_datos_normalizados()
    {
        var datos = DatosDeRegistro.Crear("  Ana Lopez ", "Ani", "ANA.L", "Ana@Correo.com", null);

        var usuario = Usuario.Registrar(datos, "hash-de-prueba", Ahora);

        Assert.NotEqual(Guid.Empty, usuario.Id);
        Assert.Equal("Ana Lopez", usuario.NombreCompleto);
        Assert.Equal("ana.l", usuario.NombreDeUsuario);
        Assert.Equal("ana@correo.com", usuario.Correo);
        Assert.Null(usuario.MotivoDeRegistro);
        Assert.Equal(Ahora, usuario.CreadoEn);
    }

    [Fact]
    public void La_sesion_vence_al_cumplirse_su_duracion()
    {
        var sesion = Sesion.Abrir(Guid.NewGuid(), "hash", Ahora, TimeSpan.FromDays(7));

        Assert.True(sesion.EstaVigente(Ahora.AddDays(6)));
        Assert.False(sesion.EstaVigente(Ahora.AddDays(7)));
    }

    [Fact]
    public void No_se_imprimen_datos_personales()
    {
        var datos = DatosDeRegistro.Crear("Ana Lopez", "Ani", "ana.l", "ana@correo.com", null);
        var usuario = Usuario.Registrar(datos, "hash-de-prueba", Ahora);

        Assert.DoesNotContain("Ana", usuario.ToString(), StringComparison.Ordinal);
        Assert.DoesNotContain("Ana", datos.ToString(), StringComparison.Ordinal);
    }
}
