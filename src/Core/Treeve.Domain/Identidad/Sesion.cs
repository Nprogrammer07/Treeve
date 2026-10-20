namespace Treeve.Domain.Identidad;

/// <summary>Sesión abierta. Solo se guarda el hash del token: el token en claro lo conoce únicamente el cliente.</summary>
public sealed class Sesion
{
    public Guid Id { get; }
    public Guid UsuarioId { get; }
    public string TokenHash { get; }
    public DateTimeOffset CreadaEn { get; }
    public DateTimeOffset ExpiraEn { get; }

    private Sesion(Guid id, Guid usuarioId, string tokenHash, DateTimeOffset creadaEn, DateTimeOffset expiraEn)
    {
        Id = id;
        UsuarioId = usuarioId;
        TokenHash = tokenHash;
        CreadaEn = creadaEn;
        ExpiraEn = expiraEn;
    }

    public static Sesion Abrir(Guid usuarioId, string tokenHash, DateTimeOffset ahora, TimeSpan duracion)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(tokenHash);

        return new Sesion(Guid.NewGuid(), usuarioId, tokenHash, ahora, ahora + duracion);
    }

    public bool EstaVigente(DateTimeOffset ahora) => ahora < ExpiraEn;

    public override string ToString() => "[sesión]";
}
