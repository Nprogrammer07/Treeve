namespace Treeve.Domain.MensajesApoyo;

/// <summary>
/// Tema del desahogo, detectado por palabras clave. Solo existe en memoria mientras se arma el mensaje:
/// nunca se guarda ni se registra (ADR-001).
/// El orden importa: si dos temas empatan en palabras clave, gana el que va primero. Soledad, Malestar y Alegría
/// van antes que los demás para que, ante un empate, el mensaje cuide primero cómo se siente la persona
/// (y "no me siento feliz" cuente como malestar y no como alegría).
/// </summary>
public enum Tema
{
    Soledad,
    Malestar,
    Alegria,
    Trabajo,
    Estudio,
    Familia,
    Pareja,
    Amistad,
    Salud,
    Dinero,
}
