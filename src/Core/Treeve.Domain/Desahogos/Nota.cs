using Treeve.Domain.Comun;

namespace Treeve.Domain.Desahogos;

/// <summary>Un desahogo guardado (HU-05). El texto solo existe cifrado.</summary>
public sealed class Nota
{
    private Nota(Guid id, Guid usuarioId, Emocion emocion, byte[] textoCifrado, DateTimeOffset creadaEn)
    {
        Id = id;
        UsuarioId = usuarioId;
        Emocion = emocion;
        TextoCifrado = textoCifrado;
        CreadaEn = creadaEn;
    }

    public Guid Id { get; }
    public Guid UsuarioId { get; }
    public Emocion Emocion { get; }
    public byte[] TextoCifrado { get; }
    public DateTimeOffset CreadaEn { get; }

    /// <summary>El id llega desde afuera porque el texto se cifra atado a él y a la persona.</summary>
    public static Nota Crear(Guid id, Guid usuarioId, Emocion emocion, byte[] textoCifrado, DateTimeOffset ahora)
    {
        ArgumentNullException.ThrowIfNull(textoCifrado);

        if (!Enum.IsDefined(emocion))
        {
            throw new ExcepcionDeDominio("La emoción no es válida.");
        }

        if (textoCifrado.Length == 0)
        {
            throw new ArgumentException("La nota debe llevar su texto cifrado.", nameof(textoCifrado));
        }

        return new Nota(id, usuarioId, emocion, textoCifrado, ahora);
    }

    public bool PerteneceA(Guid usuarioId) => UsuarioId == usuarioId;

    /// <summary>Una nota produce un solo evento, así que su id identifica el evento (idempotencia del bus).</summary>
    public NotaCreada Creada() => new(Id, Id, UsuarioId, Emocion, CreadaEn);

    public override string ToString() => "[nota]";
}
