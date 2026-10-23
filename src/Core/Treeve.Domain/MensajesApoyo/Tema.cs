namespace Treeve.Domain.MensajesApoyo;

/// <summary>
/// Tema del desahogo, detectado por palabras clave. Solo existe en memoria mientras se arma el mensaje:
/// nunca se guarda ni se registra (ADR-001).
/// </summary>
public enum Tema
{
    Trabajo,
    Estudio,
    Familia,
    Pareja,
    Amistad,
    Salud,
    Dinero,
}
