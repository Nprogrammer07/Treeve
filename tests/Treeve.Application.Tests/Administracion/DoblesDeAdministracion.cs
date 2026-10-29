using Treeve.Domain.Administracion;
using Treeve.Domain.Identidad;
using Treeve.Domain.Notificaciones;
using Treeve.Domain.Services.Administracion;
using Treeve.Domain.Services.Notificaciones;

namespace Treeve.Application.Tests.Administracion;

/// <summary>Guarda los registros y anota qué rol tenía la persona en el momento de guardar, como haría la transacción.</summary>
internal sealed class RepositorioCambiosDeRolFalso : IRepositorioCambiosDeRol
{
    public List<CambioDeRol> Registrados { get; } = [];
    public List<(Guid UsuarioId, Rol RolGuardado)> RolesGuardados { get; } = [];

    public Task Registrar(CambioDeRol cambio, Usuario usuarioAfectado, CancellationToken ct)
    {
        Registrados.Add(cambio);
        RolesGuardados.Add((usuarioAfectado.Id, usuarioAfectado.Rol));
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<CambioDeRolConNombres>> Listar(int limite, int desplazamiento, CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<CambioDeRolConNombres>>(
            [.. Registrados.OrderByDescending(c => c.OcurrioEn).Skip(desplazamiento).Take(limite)
                .Select(c => new CambioDeRolConNombres(c.Id, c.AdministradorId, null, c.UsuarioAfectadoId, null, c.RolAnterior, c.RolNuevo, c.OcurrioEn))]);
}

/// <summary>Imita el índice único de evento_id: el mismo evento no se guarda dos veces.</summary>
internal sealed class RepositorioNotificacionesFalso : IRepositorioNotificaciones
{
    public List<Notificacion> Guardadas { get; } = [];
    public int LecturasGuardadas { get; private set; }

    public Task<bool> AgregarSiNoExiste(Notificacion notificacion, CancellationToken ct)
    {
        if (Guardadas.Any(n => n.EventoId == notificacion.EventoId))
        {
            return Task.FromResult(false);
        }

        Guardadas.Add(notificacion);
        return Task.FromResult(true);
    }

    public Task<IReadOnlyList<Notificacion>> ListarDeUsuario(Guid usuarioId, int limite, CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<Notificacion>>(
            [.. Guardadas.Where(n => n.UsuarioId == usuarioId).OrderByDescending(n => n.CreadaEn).Take(limite)]);

    public Task<Notificacion?> ObtenerPorId(Guid notificacionId, CancellationToken ct) =>
        Task.FromResult(Guardadas.FirstOrDefault(n => n.Id == notificacionId));

    public Task GuardarLectura(Notificacion notificacion, CancellationToken ct)
    {
        LecturasGuardadas++;
        return Task.CompletedTask;
    }
}
