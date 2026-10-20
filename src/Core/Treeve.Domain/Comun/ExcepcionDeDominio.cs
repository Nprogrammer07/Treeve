namespace Treeve.Domain.Comun;

/// <summary>Se lanza cuando se viola una regla de negocio. Su mensaje nunca incluye datos del usuario.</summary>
public sealed class ExcepcionDeDominio(string mensaje) : Exception(mensaje);
