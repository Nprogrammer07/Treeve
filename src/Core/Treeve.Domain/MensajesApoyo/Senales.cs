using Treeve.Domain.Desahogos;

namespace Treeve.Domain.MensajesApoyo;

/// <summary>
/// Lo que el motor sabe del desahogo para elegir fragmentos. Se calcula en memoria y se descarta al
/// terminar: el tema y la intensidad nunca se guardan ni se registran (ADR-001).
/// HU-06a-2 sumará tendencia, racha, hito del árbol y momento del día.
/// </summary>
public sealed record Senales(Emocion Emocion, Tema? Tema, Intensidad Intensidad)
{
    // Revela el tema del desahogo: nunca se imprime.
    public override string ToString() => "[señales]";
}
