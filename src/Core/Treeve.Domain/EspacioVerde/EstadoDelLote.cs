namespace Treeve.Domain.EspacioVerde;

/// <summary>Cómo está el lote de una persona después de cierta cantidad de riegos (HU-07a).</summary>
/// <param name="Riegos">Desahogos guardados hasta ahora.</param>
/// <param name="Niveles">Nivel de cada componente, de 1 a <see cref="ReglaDeCrecimiento.NivelMaximo"/>.</param>
/// <param name="Nutricion">Riegos acumulados desde el último crecimiento (HU-07: "cada desahogo incrementa la nutrición").</param>
/// <param name="RiegosParaElSiguiente">Cuántos desahogos faltan para el próximo crecimiento; 0 si el lote está completo.</param>
/// <param name="SiguienteEnCrecer">Qué componente crecerá después; null si el lote está completo.</param>
public sealed record EstadoDelLote(
    int Riegos,
    IReadOnlyDictionary<ComponenteDelLote, int> Niveles,
    int Nutricion,
    int RiegosParaElSiguiente,
    ComponenteDelLote? SiguienteEnCrecer)
{
    public bool Completo => SiguienteEnCrecer is null;

    public EtapaDelArbol EtapaDelArbol => (EtapaDelArbol)Nivel(ComponenteDelLote.Arbol);

    public int Nivel(ComponenteDelLote componente) => Niveles[componente];
}
