using Treeve.Domain.Comun;

namespace Treeve.Domain.Sugerencias;

/// <summary>
/// Una funcionalidad que una persona propone (HU-09). Guarda lo que pide el RNF: id único, usuario, fecha, texto y
/// estado. El texto no es un desahogo: se guarda en claro porque el staff lo gestiona (HU-11): cambia su estado y deja
/// un comentario que ve quien la envió.
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

    /// <summary>HU-11: la respuesta del staff, visible para quien sugirió. Una sola: la nueva reemplaza a la anterior.</summary>
    public string? Comentario { get; private set; }

    /// <summary>Quién del staff hizo el último cambio (estado o comentario). No se muestra a quien sugirió.</summary>
    public Guid? GestionadaPor { get; private set; }

    public DateTimeOffset? GestionadaEn { get; private set; }

    public static Sugerencia Enviar(Guid usuarioId, TextoSugerencia texto, DateTimeOffset ahora)
    {
        ArgumentNullException.ThrowIfNull(texto);

        return new Sugerencia(Guid.NewGuid(), usuarioId, texto.Valor, EstadoSugerencia.Pendiente, ahora);
    }

    public bool PerteneceA(Guid usuarioId) => UsuarioId == usuarioId;

    /// <summary>
    /// HU-11: el staff cambia el estado, el comentario o ambos. Los cambios de estado son libres entre los cuatro (así
    /// se corrige un error). Si nada cambia de verdad, no se registra nada y devuelve null: no hay a quién avisar.
    /// Si algo cambió, guarda quién y cuándo y devuelve el evento para avisarle a quien sugirió.
    /// </summary>
    /// <param name="comentario">Null deja el comentario como está; un comentario vacío lo quita.</param>
    public SugerenciaGestionada? Gestionar(Guid staffId, EstadoSugerencia? nuevoEstado, ComentarioDelStaff? comentario, DateTimeOffset ahora)
    {
        if (nuevoEstado is null && comentario is null)
        {
            throw new ExcepcionDeDominio("Indica el nuevo estado, un comentario o ambos.");
        }

        if (nuevoEstado is { } estado && !Enum.IsDefined(estado))
        {
            throw new ExcepcionDeDominio("El estado no es válido.");
        }

        var cambiaElEstado = nuevoEstado is { } nuevo && nuevo != Estado;
        var cambiaElComentario = comentario is not null && comentario.Valor != Comentario;

        if (!cambiaElEstado && !cambiaElComentario)
        {
            return null;
        }

        Estado = nuevoEstado ?? Estado;
        Comentario = cambiaElComentario ? comentario!.Valor : Comentario;
        GestionadaPor = staffId;
        GestionadaEn = ahora;

        return new SugerenciaGestionada(Guid.NewGuid(), Id, UsuarioId, Estado, cambiaElEstado, cambiaElComentario, ahora);
    }

    public override string ToString() => "[sugerencia]";
}
