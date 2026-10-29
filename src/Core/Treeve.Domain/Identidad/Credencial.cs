namespace Treeve.Domain.Identidad;

/// <summary>
/// Datos de acceso de un usuario (tabla credenciales, 1:1 con usuarios): el hash de la contraseña y el
/// bloqueo por intentos fallidos (HU-03a). Vive aparte del perfil para que ninguna consulta de perfil
/// ni del panel de staff toque datos de autenticación.
/// </summary>
public sealed class Credencial
{
    /// <summary>HU-03a: intentos fallidos consecutivos que bloquean la cuenta.</summary>
    public const int MaximoDeIntentosFallidos = 5;

    /// <summary>HU-03a: duración del bloqueo temporal (el criterio sugiere 15 minutos).</summary>
    public static readonly TimeSpan DuracionDelBloqueo = TimeSpan.FromMinutes(15);

    public Guid UsuarioId { get; }
    public string HashDeContrasena { get; private set; }

    /// <summary>Intentos fallidos desde el último acceso exitoso o el último bloqueo.</summary>
    public int IntentosFallidos { get; private set; }

    public DateTimeOffset? BloqueadoHasta { get; private set; }
    public DateTimeOffset ActualizadaEn { get; private set; }

    private Credencial(
        Guid usuarioId,
        string hashDeContrasena,
        int intentosFallidos,
        DateTimeOffset? bloqueadoHasta,
        DateTimeOffset actualizadaEn)
    {
        UsuarioId = usuarioId;
        HashDeContrasena = hashDeContrasena;
        IntentosFallidos = intentosFallidos;
        BloqueadoHasta = bloqueadoHasta;
        ActualizadaEn = actualizadaEn;
    }

    public static Credencial Crear(Guid usuarioId, string hashDeContrasena, DateTimeOffset ahora)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(hashDeContrasena);

        return new Credencial(usuarioId, hashDeContrasena, intentosFallidos: 0, bloqueadoHasta: null, ahora);
    }

    public bool EstaBloqueada(DateTimeOffset ahora) => BloqueadoHasta is { } hasta && ahora < hasta;

    public TimeSpan TiempoDeBloqueoRestante(DateTimeOffset ahora) =>
        BloqueadoHasta is { } hasta && ahora < hasta ? hasta - ahora : TimeSpan.Zero;

    /// <summary>Cuenta un intento fallido. Al llegar al máximo, bloquea la cuenta y reinicia el contador.</summary>
    public void RegistrarIntentoFallido(DateTimeOffset ahora)
    {
        IntentosFallidos++;
        ActualizadaEn = ahora;

        if (IntentosFallidos >= MaximoDeIntentosFallidos)
        {
            BloqueadoHasta = ahora + DuracionDelBloqueo;
            IntentosFallidos = 0;
        }
    }

    /// <summary>Un acceso correcto borra los intentos fallidos: el criterio habla de intentos consecutivos.</summary>
    public void RegistrarAccesoExitoso(DateTimeOffset ahora)
    {
        IntentosFallidos = 0;
        BloqueadoHasta = null;
        ActualizadaEn = ahora;
    }

    /// <summary>
    /// HU-03b: cambia la contraseña tras una recuperación. También levanta el bloqueo y borra los intentos fallidos:
    /// quien recupera su acceso no debería seguir encerrado por intentos anteriores.
    /// </summary>
    public void CambiarContrasena(string nuevoHash, DateTimeOffset ahora)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(nuevoHash);

        HashDeContrasena = nuevoHash;
        IntentosFallidos = 0;
        BloqueadoHasta = null;
        ActualizadaEn = ahora;
    }

    public override string ToString() => "[credencial]";
}
