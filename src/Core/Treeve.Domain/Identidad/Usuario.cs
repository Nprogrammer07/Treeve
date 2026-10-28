using Treeve.Domain.Comun;

namespace Treeve.Domain.Identidad;

/// <summary>
/// Perfil de un usuario registrado. Los datos de acceso viven en <see cref="Credencial"/>, y el motivo de
/// registro solo existe cifrado: es texto libre que puede ser sensible (ADR-002).
/// </summary>
public sealed class Usuario
{
    public Guid Id { get; }
    public string NombreCompleto { get; }
    public string Apodo { get; }
    public string NombreDeUsuario { get; }
    public string? Correo { get; }
    public byte[]? MotivoDeRegistroCifrado { get; }
    public DateTimeOffset CreadoEn { get; }

    /// <summary>Rol en la plataforma (HU-10). Toda persona se registra como <see cref="Rol.Usuario"/>.</summary>
    public Rol Rol { get; private set; } = Rol.Usuario;

    private Usuario(
        Guid id,
        string nombreCompleto,
        string apodo,
        string nombreDeUsuario,
        string? correo,
        byte[]? motivoDeRegistroCifrado,
        DateTimeOffset creadoEn)
    {
        Id = id;
        NombreCompleto = nombreCompleto;
        Apodo = apodo;
        NombreDeUsuario = nombreDeUsuario;
        Correo = correo;
        MotivoDeRegistroCifrado = motivoDeRegistroCifrado;
        CreadoEn = creadoEn;
    }

    /// <summary>
    /// Registra el perfil. El id llega desde afuera porque el motivo se cifra atado a él. El motivo en claro
    /// de <paramref name="datos"/> no se guarda: solo su versión cifrada.
    /// </summary>
    public static Usuario Registrar(Guid id, DatosDeRegistro datos, byte[]? motivoDeRegistroCifrado, DateTimeOffset ahora)
    {
        ArgumentNullException.ThrowIfNull(datos);

        if ((datos.MotivoDeRegistro is null) != (motivoDeRegistroCifrado is null))
        {
            throw new ArgumentException("El motivo cifrado debe corresponder al motivo de registro.", nameof(motivoDeRegistroCifrado));
        }

        return new Usuario(
            id,
            datos.NombreCompleto,
            datos.Apodo,
            datos.NombreDeUsuario,
            datos.Correo,
            motivoDeRegistroCifrado,
            ahora);
    }

    /// <summary>
    /// Cambia el rol (lo usará la gestión de staff, HU-12, que además deja su propio registro de auditoría).
    /// Devuelve el rol anterior para que quien llama lo registre.
    /// </summary>
    public Rol CambiarRol(Rol nuevo)
    {
        if (!Enum.IsDefined(nuevo))
        {
            throw new ExcepcionDeDominio("El rol no es válido.");
        }

        var anterior = Rol;
        Rol = nuevo;
        return anterior;
    }

    /// <summary>El identificador de login (usuario o correo) se compara en minúsculas y sin espacios.</summary>
    public static string NormalizarIdentificador(string? identificador) => ReglasDeIdentidad.Normalizar(identificador);

    public override string ToString() => "[usuario]";
}
