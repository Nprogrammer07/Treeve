using Treeve.Domain.Identidad;

namespace Treeve.Domain.Services.Identidad;

public interface IRepositorioRecuperaciones
{
    Task Agregar(RecuperacionDeContrasena recuperacion, CancellationToken ct);

    /// <summary>Indica si la persona ya pidió una recuperación desde ese momento (para limitar la frecuencia).</summary>
    Task<bool> HayEmitidaDesde(Guid usuarioId, DateTimeOffset desde, CancellationToken ct);

    /// <summary>Deja sin efecto las recuperaciones pendientes de la persona: solo sirve el enlace más reciente.</summary>
    Task InvalidarPendientes(Guid usuarioId, DateTimeOffset ahora, CancellationToken ct);

    /// <summary>
    /// Marca como usada la recuperación vigente con ese hash y devuelve de quién es. De un solo paso y atómico: si dos
    /// peticiones llegan a la vez con el mismo token, solo una lo consigue y la otra recibe null. También devuelve null
    /// si el token no existe, ya se usó o venció.
    /// </summary>
    Task<Guid?> Consumir(string tokenHash, DateTimeOffset ahora, CancellationToken ct);
}
