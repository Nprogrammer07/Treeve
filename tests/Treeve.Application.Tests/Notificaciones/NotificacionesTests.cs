using Treeve.Application.Comun;
using Treeve.Application.Notificaciones;
using Treeve.Application.Tests.Administracion;
using Treeve.Application.Tests.Identidad;
using Treeve.Domain.Administracion;
using Treeve.Domain.Identidad;
using Treeve.Domain.Notificaciones;

namespace Treeve.Application.Tests.Notificaciones;

public class NotificacionesTests
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 27, 20, 0, 0, TimeSpan.FromHours(-5));

    private readonly RepositorioNotificacionesFalso notificaciones = new();
    private readonly RelojManual reloj = new(Ahora);
    private readonly AlCambiarRol alCambiarRol;
    private readonly ListarMisNotificaciones listar;
    private readonly MarcarNotificacionLeida marcar;
    private readonly Guid ana = Guid.NewGuid();

    public NotificacionesTests()
    {
        alCambiarRol = new AlCambiarRol(notificaciones);
        listar = new ListarMisNotificaciones(notificaciones);
        marcar = new MarcarNotificacionLeida(notificaciones, reloj);
    }

    private static RolCambiado Ascenso(Guid usuarioId) => new(Guid.NewGuid(), usuarioId, Rol.Usuario, Rol.Staff, Ahora);

    [Fact]
    public async Task Al_ascender_a_una_persona_le_deja_un_aviso()
    {
        await alCambiarRol.Manejar(Ascenso(ana), CancellationToken.None);

        var aviso = Assert.Single(await listar.Ejecutar(ana, CancellationToken.None));
        Assert.Equal(TipoDeNotificacion.AscendidoAStaff, aviso.Tipo);
        Assert.Contains("staff", aviso.Mensaje, StringComparison.Ordinal);
        Assert.False(aviso.Leida);
    }

    [Fact]
    public async Task Al_revocar_el_staff_tambien_le_avisa()
    {
        await alCambiarRol.Manejar(new RolCambiado(Guid.NewGuid(), ana, Rol.Staff, Rol.Usuario, Ahora), CancellationToken.None);

        Assert.Equal(TipoDeNotificacion.StaffRevocado, Assert.Single(await listar.Ejecutar(ana, CancellationToken.None)).Tipo);
    }

    [Fact]
    public async Task El_mismo_evento_dos_veces_avisa_una_sola_vez()
    {
        var evento = Ascenso(ana);

        await alCambiarRol.Manejar(evento, CancellationToken.None);
        await alCambiarRol.Manejar(evento, CancellationToken.None);

        Assert.Single(notificaciones.Guardadas);
    }

    [Fact]
    public async Task Cada_persona_ve_solo_sus_avisos()
    {
        await alCambiarRol.Manejar(Ascenso(ana), CancellationToken.None);
        await alCambiarRol.Manejar(Ascenso(Guid.NewGuid()), CancellationToken.None);

        Assert.Single(await listar.Ejecutar(ana, CancellationToken.None));
    }

    [Fact]
    public async Task La_duena_marca_su_aviso_como_leido_una_sola_vez()
    {
        await alCambiarRol.Manejar(Ascenso(ana), CancellationToken.None);
        var id = notificaciones.Guardadas[0].Id;

        await marcar.Ejecutar(ana, id, CancellationToken.None);
        reloj.Avanzar(TimeSpan.FromHours(1));
        await marcar.Ejecutar(ana, id, CancellationToken.None);

        Assert.True(Assert.Single(await listar.Ejecutar(ana, CancellationToken.None)).Leida);
        Assert.Equal(Ahora, notificaciones.Guardadas[0].LeidaEn);
        Assert.Equal(1, notificaciones.LecturasGuardadas);
    }

    [Fact]
    public async Task Nadie_marca_un_aviso_ajeno_ni_uno_que_no_existe()
    {
        await alCambiarRol.Manejar(Ascenso(ana), CancellationToken.None);

        await Assert.ThrowsAsync<AccesoDenegado>(() => marcar.Ejecutar(Guid.NewGuid(), notificaciones.Guardadas[0].Id, CancellationToken.None));
        await Assert.ThrowsAsync<AccesoDenegado>(() => marcar.Ejecutar(ana, Guid.NewGuid(), CancellationToken.None));
        Assert.False(notificaciones.Guardadas[0].Leida);
    }
}
