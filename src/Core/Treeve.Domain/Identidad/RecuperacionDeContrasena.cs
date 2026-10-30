namespace Treeve.Domain.Identidad;

/// <summary>
/// HU-03b: solicitud de recuperación de contraseña. Es de un solo uso y vence a los 30 minutos. Solo se guarda el
/// hash del token: el token en claro viaja únicamente en el enlace del correo.
/// </summary>
public sealed class RecuperacionDeContrasena
{
    /// <summary>Tiempo que sirve el enlace del correo. Valor propuesto, por confirmar con el PO.</summary>
    public static readonly TimeSpan Vigencia = TimeSpan.FromMinutes(30);

    /// <summary>
    /// Mínimo entre dos solicitudes para la misma cuenta: evita que alguien llene de correos la bandeja de otra
    /// persona repitiendo la petición.
    /// </summary>
    public static readonly TimeSpan EsperaEntreSolicitudes = TimeSpan.FromMinutes(2);

    public Guid Id { get; }
    public Guid UsuarioId { get; }
    public string TokenHash { get; }
    public DateTimeOffset CreadaEn { get; }
    public DateTimeOffset ExpiraEn { get; }

    /// <summary>Cuándo se usó (o se reemplazó por una solicitud más nueva). Null mientras siga pendiente.</summary>
    public DateTimeOffset? UsadaEn { get; private set; }

    private RecuperacionDeContrasena(Guid id, Guid usuarioId, string tokenHash, DateTimeOffset creadaEn, DateTimeOffset expiraEn)
    {
        Id = id;
        UsuarioId = usuarioId;
        TokenHash = tokenHash;
        CreadaEn = creadaEn;
        ExpiraEn = expiraEn;
    }

    public static RecuperacionDeContrasena Emitir(Guid usuarioId, string tokenHash, DateTimeOffset ahora)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(tokenHash);

        return new RecuperacionDeContrasena(Guid.NewGuid(), usuarioId, tokenHash, ahora, ahora + Vigencia);
    }

    public bool EstaVigente(DateTimeOffset ahora) => UsadaEn is null && ahora < ExpiraEn;

    public void MarcarComoUsada(DateTimeOffset ahora) => UsadaEn ??= ahora;

    // El hash del token no se imprime.
    public override string ToString() => "[recuperación de contraseña]";
}
