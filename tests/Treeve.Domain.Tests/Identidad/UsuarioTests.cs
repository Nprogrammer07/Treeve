using Treeve.Domain.Identidad;

namespace Treeve.Domain.Tests.Identidad;

public class UsuarioTests
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 15, 20, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Registrar_crea_un_usuario_con_los_datos_normalizados()
    {
        var datos = DatosDeRegistro.Crear("  Ana Lopez ", "Ani", "ANA.L", "Ana@Correo.com", null);

        var id = Guid.NewGuid();

        var usuario = Usuario.Registrar(id, datos, null, Ahora);

        Assert.Equal(id, usuario.Id);
        Assert.Equal("Ana Lopez", usuario.NombreCompleto);
        Assert.Equal("ana.l", usuario.NombreDeUsuario);
        Assert.Equal("ana@correo.com", usuario.Correo);
        Assert.Null(usuario.MotivoDeRegistroCifrado);
        Assert.Equal(Ahora, usuario.CreadoEn);
    }

    [Fact]
    public void El_motivo_solo_se_guarda_cifrado()
    {
        var conMotivo = DatosDeRegistro.Crear("Ana Lopez", "Ani", "ana.l", null, "Quiero un espacio para mí");
        var sinMotivo = DatosDeRegistro.Crear("Ana Lopez", "Ani", "ana.l", null, null);

        Assert.Throws<ArgumentException>(() => Usuario.Registrar(Guid.NewGuid(), conMotivo, null, Ahora));
        Assert.Throws<ArgumentException>(() => Usuario.Registrar(Guid.NewGuid(), sinMotivo, [1, 2, 3], Ahora));
        Assert.Equal([1, 2, 3], Usuario.Registrar(Guid.NewGuid(), conMotivo, [1, 2, 3], Ahora).MotivoDeRegistroCifrado);
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
        var usuario = Usuario.Registrar(Guid.NewGuid(), datos, null, Ahora);

        Assert.DoesNotContain("Ana", usuario.ToString(), StringComparison.Ordinal);
        Assert.DoesNotContain("Ana", datos.ToString(), StringComparison.Ordinal);
    }
}
