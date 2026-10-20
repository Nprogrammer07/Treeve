namespace Treeve.Domain.Identidad;

/// <summary>Usuario registrado. Guarda el hash de la contraseña, nunca la contraseña.</summary>
public sealed class Usuario
{
    /// <summary>HU-03a: intentos fallidos consecutivos que bloquean la cuenta.</summary>
    public const int MaximoDeIntentosFallidos = 5;

    /// <summary>HU-03a: duración del bloqueo temporal (el criterio sugiere 15 minutos).</summary>
    public static readonly TimeSpan DuracionDelBloqueo = TimeSpan.FromMinutes(15);

    public Guid Id { get; }
    public string NombreCompleto { get; }
    public string Apodo { get; }
    public string NombreDeUsuario { get; }
    public string? Correo { get; }
    public string? MotivoDeRegistro { get; }
    public string HashDeContrasena { get; }
    public DateTimeOffset CreadoEn { get; }

    /// <summary>Intentos fallidos desde el último acceso exitoso o el último bloqueo.</summary>
    public int IntentosFallidos { get; private set; }

    public DateTimeOffset? BloqueadoHasta { get; private set; }

    private Usuario(
        Guid id,
        string nombreCompleto,
        string apodo,
        string nombreDeUsuario,
        string? correo,
        string? motivoDeRegistro,
        string hashDeContrasena,
        DateTimeOffset creadoEn,
        int intentosFallidos,
        DateTimeOffset? bloqueadoHasta)
    {
        Id = id;
        NombreCompleto = nombreCompleto;
        Apodo = apodo;
        NombreDeUsuario = nombreDeUsuario;
        Correo = correo;
        MotivoDeRegistro = motivoDeRegistro;
        HashDeContrasena = hashDeContrasena;
        CreadoEn = creadoEn;
        IntentosFallidos = intentosFallidos;
        BloqueadoHasta = bloqueadoHasta;
    }

    public static Usuario Registrar(DatosDeRegistro datos, string hashDeContrasena, DateTimeOffset ahora)
    {
        ArgumentNullException.ThrowIfNull(datos);
        ArgumentException.ThrowIfNullOrWhiteSpace(hashDeContrasena);

        return new Usuario(
            Guid.NewGuid(),
            datos.NombreCompleto,
            datos.Apodo,
            datos.NombreDeUsuario,
            datos.Correo,
            datos.MotivoDeRegistro,
            hashDeContrasena,
            ahora,
            intentosFallidos: 0,
            bloqueadoHasta: null);
    }

    /// <summary>El identificador de login (usuario o correo) se compara en minúsculas y sin espacios.</summary>
    public static string NormalizarIdentificador(string? identificador) => ReglasDeIdentidad.Normalizar(identificador);

    public bool EstaBloqueado(DateTimeOffset ahora) => BloqueadoHasta is { } hasta && ahora < hasta;

    public TimeSpan TiempoDeBloqueoRestante(DateTimeOffset ahora) =>
        BloqueadoHasta is { } hasta && ahora < hasta ? hasta - ahora : TimeSpan.Zero;

    /// <summary>Cuenta un intento fallido. Al llegar al máximo, bloquea la cuenta y reinicia el contador.</summary>
    public void RegistrarIntentoFallido(DateTimeOffset ahora)
    {
        IntentosFallidos++;

        if (IntentosFallidos >= MaximoDeIntentosFallidos)
        {
            BloqueadoHasta = ahora + DuracionDelBloqueo;
            IntentosFallidos = 0;
        }
    }

    /// <summary>Un acceso correcto borra los intentos fallidos: el criterio habla de intentos consecutivos.</summary>
    public void RegistrarAccesoExitoso()
    {
        IntentosFallidos = 0;
        BloqueadoHasta = null;
    }

    public override string ToString() => "[usuario]";
}
