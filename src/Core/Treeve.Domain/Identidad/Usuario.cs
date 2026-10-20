namespace Treeve.Domain.Identidad;

/// <summary>Usuario registrado. Guarda el hash de la contraseña, nunca la contraseña.</summary>
public sealed class Usuario
{
    public Guid Id { get; }
    public string NombreCompleto { get; }
    public string Apodo { get; }
    public string NombreDeUsuario { get; }
    public string? Correo { get; }
    public string? MotivoDeRegistro { get; }
    public string HashDeContrasena { get; }
    public DateTimeOffset CreadoEn { get; }

    private Usuario(
        Guid id,
        string nombreCompleto,
        string apodo,
        string nombreDeUsuario,
        string? correo,
        string? motivoDeRegistro,
        string hashDeContrasena,
        DateTimeOffset creadoEn)
    {
        Id = id;
        NombreCompleto = nombreCompleto;
        Apodo = apodo;
        NombreDeUsuario = nombreDeUsuario;
        Correo = correo;
        MotivoDeRegistro = motivoDeRegistro;
        HashDeContrasena = hashDeContrasena;
        CreadoEn = creadoEn;
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
            ahora);
    }

    public override string ToString() => "[usuario]";
}
