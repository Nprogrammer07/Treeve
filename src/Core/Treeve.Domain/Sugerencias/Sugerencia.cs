namespace Treeve.Domain.Sugerencias;

/// <summary>
/// Una funcionalidad que una persona propone (HU-09). Guarda lo que pide el RNF: id único, usuario, fecha, texto y
/// estado. El texto no es un desahogo: se guarda en claro porque el staff lo gestiona (HU-11).
/// </summary>
public sealed class Sugerencia
{
    private Sugerencia(Guid id, Guid usuarioId, string texto, EstadoSugerencia estado, DateTimeOffset creadaEn)
    {
        Id = id;
        UsuarioId = usuarioId;
        Texto = texto;
        Estado = estado;
        CreadaEn = creadaEn;
    }

    public Guid Id { get; }
    public Guid UsuarioId { get; }
    public string Texto { get; }
    public EstadoSugerencia Estado { get; private set; }
    public DateTimeOffset CreadaEn { get; }

    public static Sugerencia Enviar(Guid usuarioId, TextoSugerencia texto, DateTimeOffset ahora)
    {
        ArgumentNullException.ThrowIfNull(texto);

        return new Sugerencia(Guid.NewGuid(), usuarioId, texto.Valor, EstadoSugerencia.Pendiente, ahora);
    }

    public bool PerteneceA(Guid usuarioId) => UsuarioId == usuarioId;

    public override string ToString() => "[sugerencia]";
}
