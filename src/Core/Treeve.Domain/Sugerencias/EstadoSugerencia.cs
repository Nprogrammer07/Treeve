namespace Treeve.Domain.Sugerencias;

/// <summary>Estado de una sugerencia (HU-09). Toda sugerencia nace pendiente; el staff la mueve (HU-11).</summary>
public enum EstadoSugerencia
{
    Pendiente = 0,
    EnRevision = 1,
    Implementada = 2,
    Rechazada = 3,
}
