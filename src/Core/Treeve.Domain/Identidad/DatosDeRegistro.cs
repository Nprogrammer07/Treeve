namespace Treeve.Domain.Identidad;

/// <summary>Datos de registro ya validados y normalizados. No incluye la contraseña.</summary>
public sealed class DatosDeRegistro
{
    public string NombreCompleto { get; }
    public string Apodo { get; }
    public string NombreDeUsuario { get; }
    public string? Correo { get; }
    public string? MotivoDeRegistro { get; }

    private DatosDeRegistro(string nombreCompleto, string apodo, string nombreDeUsuario, string? correo, string? motivoDeRegistro)
    {
        NombreCompleto = nombreCompleto;
        Apodo = apodo;
        NombreDeUsuario = nombreDeUsuario;
        Correo = correo;
        MotivoDeRegistro = motivoDeRegistro;
    }

    public static DatosDeRegistro Crear(string? nombreCompleto, string? apodo, string? nombreDeUsuario, string? correo, string? motivo) =>
        new(
            ReglasDeIdentidad.NombreCompleto(nombreCompleto),
            ReglasDeIdentidad.Apodo(apodo),
            ReglasDeIdentidad.NombreDeUsuario(nombreDeUsuario),
            ReglasDeIdentidad.Correo(correo),
            ReglasDeIdentidad.Motivo(motivo));

    // Privacidad: si alguien lo escribe en un log por error, no se filtran los datos.
    public override string ToString() => "[datos de registro]";
}
