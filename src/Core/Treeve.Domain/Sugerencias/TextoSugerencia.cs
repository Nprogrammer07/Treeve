using Treeve.Domain.Comun;

namespace Treeve.Domain.Sugerencias;

/// <summary>Texto libre de una sugerencia de funcionalidad (HU-09): no vacío y de hasta 1000 caracteres.</summary>
public sealed class TextoSugerencia
{
    /// <summary>Si el formulario del frontend muestra un contador, debe usar este mismo número: decide el backend.</summary>
    public const int LongitudMaxima = 1000;

    public string Valor { get; }

    private TextoSugerencia(string valor) => Valor = valor;

    public static TextoSugerencia Crear(string? texto)
    {
        var valor = (texto ?? string.Empty).Trim();

        if (valor.Length == 0)
        {
            throw new ExcepcionDeDominio("Escribe tu sugerencia antes de enviarla.");
        }

        if (valor.Length > LongitudMaxima)
        {
            throw new ExcepcionDeDominio($"La sugerencia supera los {LongitudMaxima} caracteres.");
        }

        return new TextoSugerencia(valor);
    }

    // El texto es libre y puede incluir datos personales: no se imprime.
    public override string ToString() => "[sugerencia]";
}
