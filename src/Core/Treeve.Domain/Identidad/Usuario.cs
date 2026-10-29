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
    /// Cambia el rol sin más reglas. La gestión de staff (HU-12) no lo usa directamente: pasa por
    /// <see cref="AscenderAStaff"/> y <see cref="RevocarStaff"/>. Devuelve el rol anterior para que quien llama lo registre.
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

    /// <summary>
    /// HU-12: un administrador suma a la persona al staff. Solo se asciende a un usuario regular: el rol de un
    /// administrador no se toca desde la aplicación (se asigna con SQL, ADR-006). Devuelve el rol anterior.
    /// </summary>
    public Rol AscenderAStaff() => Rol switch
    {
        Rol.Usuario => CambiarRol(Rol.Staff),
        Rol.Staff => throw new ExcepcionDeDominio("Esta persona ya es parte del staff."),
        _ => throw new ExcepcionDeDominio("El rol de un administrador no se cambia desde aquí."),
    };

    /// <summary>HU-12: un administrador le quita el rol de staff a la persona, que vuelve a ser usuario regular.</summary>
    public Rol RevocarStaff() => Rol switch
    {
        Rol.Staff => CambiarRol(Rol.Usuario),
        Rol.Usuario => throw new ExcepcionDeDominio("Esta persona no es parte del staff."),
        _ => throw new ExcepcionDeDominio("El rol de un administrador no se cambia desde aquí."),
    };

    /// <summary>El identificador de login (usuario o correo) se compara en minúsculas y sin espacios.</summary>
    public static string NormalizarIdentificador(string? identificador) => ReglasDeIdentidad.Normalizar(identificador);

    public override string ToString() => "[usuario]";
}
