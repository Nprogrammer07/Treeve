using Treeve.Domain.Desahogos;

namespace Treeve.Domain.EspacioVerde;

/// <summary>
/// Un desahogo que regó el lote de su dueña (HU-07a). Su id es el de la nota: así un mismo desahogo nunca riega dos
/// veces, aunque <see cref="NotaCreada"/> llegue repetido (consumidor idempotente, TEC-03). Solo ids y la fecha:
/// nunca el texto ni la emoción.
/// </summary>
public sealed class Riego
{
    private Riego(Guid id, Guid usuarioId, DateTimeOffset ocurrioEn)
    {
        Id = id;
        UsuarioId = usuarioId;
        OcurrioEn = ocurrioEn;
    }

    /// <summary>El id de la nota que lo produjo.</summary>
    public Guid Id { get; }
    public Guid UsuarioId { get; }
    public DateTimeOffset OcurrioEn { get; }

    public static Riego PorNota(NotaCreada evento)
    {
        ArgumentNullException.ThrowIfNull(evento);

        return new Riego(evento.NotaId, evento.UsuarioId, evento.Fecha);
    }

    public override string ToString() => "[riego]";
}
