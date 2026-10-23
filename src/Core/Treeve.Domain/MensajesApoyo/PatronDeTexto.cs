namespace Treeve.Domain.MensajesApoyo;

/// <summary>
/// Palabra o frase que se busca completa y en orden dentro de un <see cref="TextoNormalizado"/>.
/// Se escribe con ortografía normal ("mamá"); al compararla se normaliza igual que el texto.
/// Un * al final de una palabra acepta cualquier terminación: "trabaj*" encuentra "trabajo" y "trabajando".
/// </summary>
public sealed class PatronDeTexto
{
    private readonly string[] palabras;
    private readonly bool[] admitenTerminacion;

    private PatronDeTexto(string original, string[] palabras, bool[] admitenTerminacion)
    {
        Original = original;
        this.palabras = palabras;
        this.admitenTerminacion = admitenTerminacion;
    }

    public string Original { get; }

    public int CantidadDePalabras => palabras.Length;

    public static PatronDeTexto Crear(string patron)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(patron);

        var partes = patron.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var palabras = new string[partes.Length];
        var admitenTerminacion = new bool[partes.Length];

        for (var i = 0; i < partes.Length; i++)
        {
            admitenTerminacion[i] = partes[i].EndsWith('*');
            palabras[i] = TextoNormalizado.Normalizar(admitenTerminacion[i] ? partes[i][..^1] : partes[i]);

            // Cada parte debe quedar como una sola palabra: "a-b", "tra*bajo" o un "*" suelto se leerían distinto a lo escrito.
            if (palabras[i].Length == 0 || palabras[i].Contains(' ', StringComparison.Ordinal))
            {
                throw new ArgumentException($"El patrón \"{patron}\" no es válido: usa palabras separadas por espacios y * solo al final.", nameof(patron));
            }
        }

        return new PatronDeTexto(patron, palabras, admitenTerminacion);
    }

    /// <summary>Posición de la primera coincidencia desde <paramref name="desde"/>, o -1 si no hay.</summary>
    public int BuscarEn(IReadOnlyList<string> texto, int desde)
    {
        ArgumentNullException.ThrowIfNull(texto);

        for (var inicio = desde; inicio <= texto.Count - palabras.Length; inicio++)
        {
            if (CoincideEn(texto, inicio))
            {
                return inicio;
            }
        }

        return -1;
    }

    public override string ToString() => Original;

    private bool CoincideEn(IReadOnlyList<string> texto, int inicio)
    {
        for (var j = 0; j < palabras.Length; j++)
        {
            var palabra = texto[inicio + j];
            var coincide = admitenTerminacion[j]
                ? palabra.StartsWith(palabras[j], StringComparison.Ordinal)
                : palabra == palabras[j];

            if (!coincide)
            {
                return false;
            }
        }

        return true;
    }
}
