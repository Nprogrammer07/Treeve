namespace Treeve.Domain.Identidad;

/// <summary>
/// Registro de auditoría de un intento de entrar a una ruta de staff o administración sin el rol que pide
/// (HU-10, RNF de seguridad): quién, cuándo y desde qué IP. Es un registro que solo se agrega: no existe una
/// operación para cambiarlo ni borrarlo.
/// </summary>
public sealed class AccesoNoAutorizado
{
    public const int IpMaxima = 45; // largo máximo de una dirección IPv6 en texto
    public const int RecursoMaximo = 200;
    public const string IpDesconocida = "desconocida";

    private AccesoNoAutorizado(Guid id, Guid usuarioId, DateTimeOffset ocurrioEn, string ip, string recurso, Rol rolRequerido)
    {
        Id = id;
        UsuarioId = usuarioId;
        OcurrioEn = ocurrioEn;
        Ip = ip;
        Recurso = recurso;
        RolRequerido = rolRequerido;
    }

    public Guid Id { get; }
    public Guid UsuarioId { get; }
    public DateTimeOffset OcurrioEn { get; }
    public string Ip { get; }

    /// <summary>Método y ruta, sin parámetros de consulta (por ejemplo, "GET /api/staff/acceso").</summary>
    public string Recurso { get; }

    public Rol RolRequerido { get; }

    public static AccesoNoAutorizado Registrar(Guid usuarioId, string? ip, string recurso, Rol rolRequerido, DateTimeOffset ahora)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(recurso);

        var ipLimpia = (ip ?? string.Empty).Trim();

        return new AccesoNoAutorizado(
            Guid.NewGuid(),
            usuarioId,
            ahora,
            ipLimpia.Length == 0 ? IpDesconocida : Recortar(ipLimpia, IpMaxima),
            Recortar(recurso.Trim(), RecursoMaximo),
            rolRequerido);
    }

    // La IP identifica a una persona: no se imprime.
    public override string ToString() => "[acceso no autorizado]";

    private static string Recortar(string texto, int maximo) => texto.Length <= maximo ? texto : texto[..maximo];
}
