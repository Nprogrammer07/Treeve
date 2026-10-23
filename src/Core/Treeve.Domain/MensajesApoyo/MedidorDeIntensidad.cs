using System.Text.RegularExpressions;

namespace Treeve.Domain.MensajesApoyo;

/// <summary>
/// Estima la intensidad con 4 pistas (ADR-001): texto largo, escrito en mayúsculas, signos repetidos y
/// palabras absolutas. Ninguna pista: baja; una: media; dos o más: alta.
/// </summary>
public static partial class MedidorDeIntensidad
{
    public const int LongitudExtensa = 400;
    public const int MinimoDePalabrasAbsolutas = 2;

    /// <summary>Con menos letras, unas mayúsculas no alcanzan para decir que es un grito ("OK", "ya").</summary>
    private const int LetrasMinimasParaGrito = 12;
    private const double ProporcionDeGrito = 0.6;

    private static readonly IReadOnlyList<PatronDeTexto> PalabrasAbsolutas =
    [
        .. new[] { "nunca", "siempre", "nada", "nadie", "todo", "todos", "todas", "jamás", "ninguno", "ninguna", "odio", "hart*", "insoportable" }
            .Select(PatronDeTexto.Crear),
    ];

    public static Intensidad Medir(string texto, TextoNormalizado normalizado)
    {
        ArgumentNullException.ThrowIfNull(texto);
        ArgumentNullException.ThrowIfNull(normalizado);

        var pistas = 0;
        pistas += texto.Length >= LongitudExtensa ? 1 : 0;
        pistas += EsGrito(texto) ? 1 : 0;
        pistas += SignosRepetidos().IsMatch(texto) ? 1 : 0;
        pistas += PalabrasAbsolutas.Sum(normalizado.ContarCoincidencias) >= MinimoDePalabrasAbsolutas ? 1 : 0;

        return pistas switch
        {
            0 => Intensidad.Baja,
            1 => Intensidad.Media,
            _ => Intensidad.Alta,
        };
    }

    private static bool EsGrito(string texto)
    {
        var letras = texto.Count(char.IsLetter);
        return letras >= LetrasMinimasParaGrito && texto.Count(char.IsUpper) >= letras * ProporcionDeGrito;
    }

    [GeneratedRegex("[!¡?¿]{2,}")]
    private static partial Regex SignosRepetidos();
}
