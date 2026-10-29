using Treeve.Domain.Administracion;
using Treeve.Domain.Identidad;
using Treeve.Domain.Notificaciones;

namespace Treeve.Domain.Tests.Notificaciones;

public class NotificacionTests
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 27, 20, 0, 0, TimeSpan.FromHours(-5));

    private static RolCambiado Evento(Rol anterior, Rol nuevo) => new(Guid.NewGuid(), Guid.NewGuid(), anterior, nuevo, Ahora);

    [Theory]
    [InlineData(Rol.Usuario, Rol.Staff, TipoDeNotificacion.AscendidoAStaff)]
    [InlineData(Rol.Staff, Rol.Usuario, TipoDeNotificacion.StaffRevocado)]
    public void Un_cambio_de_rol_produce_el_aviso_que_le_corresponde(Rol anterior, Rol nuevo, TipoDeNotificacion tipo)
    {
        var evento = Evento(anterior, nuevo);

        var aviso = Notificacion.PorCambioDeRol(evento);

        Assert.Equal(tipo, aviso.Tipo);
        Assert.Equal(evento.UsuarioId, aviso.UsuarioId);
        Assert.Equal(evento.EventoId, aviso.EventoId);
        Assert.Equal(Ahora, aviso.CreadaEn);
        Assert.False(aviso.Leida);
        Assert.False(string.IsNullOrWhiteSpace(aviso.Mensaje));
    }

    [Fact]
    public void Solo_se_avisa_la_entrada_o_la_salida_del_staff()
    {
        Assert.Throws<ArgumentException>(() => Notificacion.PorCambioDeRol(Evento(Rol.Usuario, Rol.Administrador)));
    }

    [Fact]
    public void Leerla_dos_veces_conserva_la_fecha_de_la_primera_lectura()
    {
        var aviso = Notificacion.PorCambioDeRol(Evento(Rol.Usuario, Rol.Staff));

        aviso.MarcarLeida(Ahora);
        aviso.MarcarLeida(Ahora.AddHours(1));

        Assert.True(aviso.Leida);
        Assert.Equal(Ahora, aviso.LeidaEn);
    }

    [Fact]
    public void Pertenece_solo_a_la_persona_que_la_recibe()
    {
        var evento = Evento(Rol.Usuario, Rol.Staff);
        var aviso = Notificacion.PorCambioDeRol(evento);

        Assert.True(aviso.PerteneceA(evento.UsuarioId));
        Assert.False(aviso.PerteneceA(Guid.NewGuid()));
    }
}
