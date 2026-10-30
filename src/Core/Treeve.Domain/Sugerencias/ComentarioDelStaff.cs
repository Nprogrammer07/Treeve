using Treeve.Domain.Comun;

namespace Treeve.Domain.Sugerencias;

/// <summary>
/// HU-11: la respuesta del staff que ve la persona que sugirió. Hay una sola por sugerencia; una nueva reemplaza a la
/// anterior. Un texto vacío significa "quitar el comentario".
/// </summary>
public sealed class ComentarioDelStaff
{
    /// <summary>Si el panel muestra un contador, debe usar este mismo número: decide el backend.</summary>
    public const int LongitudMaxima = 500;

    /// <summary>Null cuando el staff quita el comentario.</summary>
    public string? Valor { get; }

    private ComentarioDelStaff(string? valor) => Valor = valor;

    public static ComentarioDelStaff Crear(string texto)
    {
        ArgumentNullException.ThrowIfNull(texto);

        var valor = texto.Trim();

        if (valor.Length > LongitudMaxima)
        {
            throw new ExcepcionDeDominio($"El comentario supera los {LongitudMaxima} caracteres.");
        }

        return new ComentarioDelStaff(valor.Length == 0 ? null : valor);
    }

    // Texto libre que puede incluir datos personales: no se imprime.
    public override string ToString() => "[comentario del staff]";
}
