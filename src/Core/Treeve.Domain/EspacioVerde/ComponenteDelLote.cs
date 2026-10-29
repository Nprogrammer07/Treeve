namespace Treeve.Domain.EspacioVerde;

/// <summary>
/// Lo que crece en el lote de cada persona (HU-07a). El orden es el turno de crecimiento: primero el árbol, luego las
/// flores, luego el bosque, y de nuevo el árbol.
/// </summary>
public enum ComponenteDelLote
{
    /// <summary>El árbol de la persona: brote → tallo → flor → árbol adulto.</summary>
    Arbol,

    /// <summary>Las flores alrededor del árbol.</summary>
    Flores,

    /// <summary>El bosque de los bordes del lote, que se hace más denso.</summary>
    Bosque,
}

/// <summary>Las etapas del árbol, en el orden del producto. Nivel 1 = brote, nivel 4 = árbol adulto.</summary>
public enum EtapaDelArbol
{
    Brote = 1,
    Tallo = 2,
    Flor = 3,
    ArbolAdulto = 4,
}
