using Treeve.Domain.Desahogos;

namespace Treeve.Domain.MensajesApoyo;

/// <summary>
/// Lo que el motor sabe del desahogo para elegir fragmentos. Se calcula en memoria y se descarta al
/// terminar: el tema y la intensidad nunca se guardan ni se registran (ADR-001).
/// HU-06a-2 sumará tendencia, racha, hito del árbol y momento del día.
/// </summary>
public sealed record Senales(Emocion Emocion, Tema? Tema, Intensidad Intensidad)
{
    private enum Tono
    {
        Positivo,
        Negativo,
    }

    /// <summary>
    /// El texto suena distinto a la emoción elegida: Felicidad con un texto de soledad o malestar, o Tristeza,
    /// Rabia o Miedo con un texto alegre. La emoción sigue siendo la base del mensaje, pero ante una contradicción
    /// el motor prefiere fragmentos que no celebran ni consuelan de más (los marcados con <c>contradice</c>).
    /// Duda no cuenta: no es ni positiva ni negativa. Se calcula, no se guarda.
    /// </summary>
    public bool Contradice => TonoDeLaEmocion(Emocion) is { } deLaEmocion && TonoDelTema(Tema) is { } deLoEscrito && deLaEmocion != deLoEscrito;

    private static Tono? TonoDeLaEmocion(Emocion emocion) => emocion switch
    {
        Emocion.Felicidad => Tono.Positivo,
        Emocion.Tristeza or Emocion.Rabia or Emocion.Miedo => Tono.Negativo,
        _ => null,
    };

    private static Tono? TonoDelTema(Tema? tema) => tema switch
    {
        MensajesApoyo.Tema.Alegria => Tono.Positivo,
        MensajesApoyo.Tema.Soledad or MensajesApoyo.Tema.Malestar => Tono.Negativo,
        _ => null,
    };

    // Revela el tema del desahogo: nunca se imprime.
    public override string ToString() => "[señales]";
}
