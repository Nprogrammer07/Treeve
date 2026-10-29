using Treeve.Domain.Comun;
using Treeve.Domain.Identidad;

namespace Treeve.Domain.Administracion;

/// <summary>
/// Se publica cuando un administrador cambia el rol de una persona (HU-12). Solo ids y metadatos. Lo escucha el área
/// Notificaciones para avisarle a la persona del cambio.
/// </summary>
/// <param name="EventoId">Es el id del <see cref="CambioDeRol"/> que lo produjo.</param>
public sealed record RolCambiado(Guid EventoId, Guid UsuarioId, Rol RolAnterior, Rol RolNuevo, DateTimeOffset Fecha)
    : IEventoDeDominio;
