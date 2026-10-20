namespace Treeve.Api.Errores;

/// <summary>Forma común de los errores de la API. El mensaje nunca incluye datos del usuario.</summary>
public sealed record ErrorResponse(string Codigo, string Mensaje);
