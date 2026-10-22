namespace Treeve.Domain.MensajesApoyo;

/// <summary>Las 5 partes de un mensaje de apoyo, en el orden en que se leen (ADR-001).</summary>
public enum Ranura
{
    /// <summary>Nombra a la persona por su apodo.</summary>
    Saludo,

    /// <summary>Reconoce la emoción sin juzgar.</summary>
    Validacion,

    /// <summary>Muestra que se entendió el tema, sin citar el texto.</summary>
    Reflejo,

    /// <summary>Contrarresta una emoción negativa o complementa una positiva.</summary>
    Contraste,

    /// <summary>Conecta con el árbol usando la metáfora de la emoción.</summary>
    Puente,
}
