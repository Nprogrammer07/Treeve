namespace Treeve.Domain.MensajesApoyo;

/// <summary>
/// Señales de riesgo (ADR-001, paso 1). Si el desahogo tiene alguna, no se compone un mensaje: se responde
/// con uno fijo que sugiere una línea de atención, sin redirigir, sin bloquear y sin avisar a nadie.
/// Ante la duda se sugiere: una sugerencia de más es amable; una de menos puede ser grave.
/// </summary>
public sealed class ReglaCrisis
{
    private readonly IReadOnlyList<PatronDeTexto> frases;
    private readonly IReadOnlyList<PatronDeTexto> excepciones;

    /// <param name="frases">Frases de riesgo ("quiero morir*").</param>
    /// <param name="excepciones">Expresiones que se parecen pero no lo son ("morir* de risa"); se descartan antes de buscar.</param>
    public ReglaCrisis(IEnumerable<string> frases, IEnumerable<string> excepciones)
    {
        ArgumentNullException.ThrowIfNull(frases);
        ArgumentNullException.ThrowIfNull(excepciones);

        this.frases = frases.Select(PatronDeTexto.Crear).ToList();
        this.excepciones = excepciones.Select(PatronDeTexto.Crear).ToList();

        if (this.frases.Count == 0)
        {
            throw new ArgumentException("La regla de crisis necesita al menos una frase.", nameof(frases));
        }
    }

    public bool Detecta(TextoNormalizado texto)
    {
        ArgumentNullException.ThrowIfNull(texto);

        var sinExcepciones = texto.Sin(excepciones);
        return frases.Any(sinExcepciones.Contiene);
    }
}
