using System.Globalization;
using System.Text;

namespace Treeve.Domain.MensajesApoyo;

/// <summary>
/// Versión del texto que solo sirve para comparar: minúsculas, sin tildes ni signos, separada en palabras.
/// Así "Mamá" y "mama" coinciden, porque mucha gente escribe sin tildes desde el celular. Nunca se muestra
/// ni se guarda: lo que ve la persona conserva su ortografía.
/// </summary>
public sealed class TextoNormalizado
{
    private TextoNormalizado(IReadOnlyList<string> palabras)
    {
        Palabras = palabras;
    }

    public IReadOnlyList<string> Palabras { get; }

    public static TextoNormalizado Desde(string? texto)
    {
        var normalizado = Normalizar(texto);
        return new TextoNormalizado(normalizado.Length == 0 ? [] : normalizado.Split(' '));
    }

    /// <summary>"¡Mi MAMÁ, otra vez!" → "mi mama otra vez".</summary>
    public static string Normalizar(string? texto)
    {
        var descompuesto = (texto ?? string.Empty).ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var resultado = new StringBuilder(descompuesto.Length);
        var separar = false;

        foreach (var caracter in descompuesto)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(caracter) == UnicodeCategory.NonSpacingMark)
            {
                continue; // la tilde de "á" o de "ñ" queda separada de su letra: se descarta
            }

            if (!char.IsLetterOrDigit(caracter))
            {
                separar = true;
                continue;
            }

            if (separar && resultado.Length > 0)
            {
                resultado.Append(' ');
            }

            separar = false;
            resultado.Append(caracter);
        }

        return resultado.ToString();
    }

    public bool Contiene(PatronDeTexto patron) => patron.BuscarEn(Palabras, 0) >= 0;

    public int ContarCoincidencias(PatronDeTexto patron)
    {
        var total = 0;
        for (var i = patron.BuscarEn(Palabras, 0); i >= 0; i = patron.BuscarEn(Palabras, i + 1))
        {
            total++;
        }

        return total;
    }

    /// <summary>
    /// Borra las coincidencias de <paramref name="patrones"/>. Las palabras borradas dejan un hueco vacío para
    /// que sus vecinas no se junten y formen una frase que no estaba ("quiero" + "morir").
    /// </summary>
    public TextoNormalizado Sin(IEnumerable<PatronDeTexto> patrones)
    {
        ArgumentNullException.ThrowIfNull(patrones);

        var palabras = Palabras.ToArray();
        foreach (var patron in patrones)
        {
            for (var i = patron.BuscarEn(palabras, 0); i >= 0; i = patron.BuscarEn(palabras, i + 1))
            {
                Array.Fill(palabras, string.Empty, i, patron.CantidadDePalabras);
            }
        }

        return new TextoNormalizado(palabras);
    }

    // Lleva palabras del desahogo: nunca se imprime.
    public override string ToString() => "[texto normalizado]";
}
