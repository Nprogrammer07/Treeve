using Treeve.Domain.Administracion;
using Treeve.Domain.Identidad;
using Treeve.Domain.Sugerencias;

namespace Treeve.Domain.Notificaciones;

public enum TipoDeNotificacion
{
    /// <summary>La persona pasó a formar parte del staff (HU-12).</summary>
    AscendidoAStaff,

    /// <summary>La persona dejó de formar parte del staff (HU-12).</summary>
    StaffRevocado,

    /// <summary>El staff cambió el estado de una sugerencia de la persona o le dejó un comentario (HU-11).</summary>
    SugerenciaRespondida,
}

/// <summary>
/// Aviso dentro de la aplicación para una persona (HU-12: "notificar al usuario el cambio"). No usa correo: llega a
/// todos, aunque no hayan registrado uno (ADR-006). Nace de un evento de dominio y guarda su id para no duplicarse si
/// el evento llega dos veces.
/// </summary>
public sealed class Notificacion
{
    private Notificacion(Guid id, Guid usuarioId, TipoDeNotificacion tipo, Guid eventoId, DateTimeOffset creadaEn, DateTimeOffset? leidaEn)
    {
        Id = id;
        UsuarioId = usuarioId;
        Tipo = tipo;
        EventoId = eventoId;
        CreadaEn = creadaEn;
        LeidaEn = leidaEn;
    }

    public Guid Id { get; }
    public Guid UsuarioId { get; }
    public TipoDeNotificacion Tipo { get; }

    /// <summary>El evento que la originó. Es único: el mismo evento nunca produce dos notificaciones.</summary>
    public Guid EventoId { get; }

    public DateTimeOffset CreadaEn { get; }
    public DateTimeOffset? LeidaEn { get; private set; }

    public bool Leida => LeidaEn is not null;

    /// <summary>El texto lo decide el backend, en un solo lugar, para que todas las pantallas digan lo mismo.</summary>
    public string Mensaje => Tipo switch
    {
        TipoDeNotificacion.AscendidoAStaff => "Ahora formas parte del staff de Treeve. Ya puedes entrar al panel de staff.",
        TipoDeNotificacion.StaffRevocado => "Ya no formas parte del staff de Treeve. Tu espacio verde y tus desahogos siguen igual.",
        TipoDeNotificacion.SugerenciaRespondida => "El staff revisó una de tus sugerencias. Mira su estado y su comentario en tu historial de sugerencias.",
        _ => throw new InvalidOperationException("Tipo de notificación desconocido."),
    };

    /// <summary>
    /// La notificación que recibe la persona cuando cambia su rol. Solo hay aviso para los cambios que hace la gestión
    /// de staff: entrar al staff o salir de él.
    /// </summary>
    public static Notificacion PorCambioDeRol(RolCambiado evento)
    {
        ArgumentNullException.ThrowIfNull(evento);

        var tipo = (evento.RolAnterior, evento.RolNuevo) switch
        {
            (Rol.Usuario, Rol.Staff) => TipoDeNotificacion.AscendidoAStaff,
            (Rol.Staff, Rol.Usuario) => TipoDeNotificacion.StaffRevocado,
            _ => throw new ArgumentException("Solo se notifica la entrada o la salida del staff.", nameof(evento)),
        };

        return new Notificacion(Guid.NewGuid(), evento.UsuarioId, tipo, evento.EventoId, evento.Fecha, leidaEn: null);
    }

    /// <summary>
    /// HU-11: el aviso que recibe quien sugirió cuando el staff gestiona su sugerencia. El mensaje no repite el comentario
    /// ni el texto de la sugerencia: la persona los ve en su historial, y la tabla de notificaciones no guarda texto libre.
    /// </summary>
    public static Notificacion PorSugerenciaGestionada(SugerenciaGestionada evento)
    {
        ArgumentNullException.ThrowIfNull(evento);

        return new Notificacion(
            Guid.NewGuid(), evento.UsuarioId, TipoDeNotificacion.SugerenciaRespondida, evento.EventoId, evento.Fecha, leidaEn: null);
    }

    public bool PerteneceA(Guid usuarioId) => UsuarioId == usuarioId;

    /// <summary>Marcarla dos veces no cambia la fecha de la primera lectura.</summary>
    public void MarcarLeida(DateTimeOffset ahora) => LeidaEn ??= ahora;

    public override string ToString() => "[notificación]";
}
