using Treeve.Domain.MensajesApoyo;

namespace Treeve.Domain.Services.MensajesApoyo;

/// <summary>Contenido del motor. Hoy es un JSON versionado en Infrastructure (ADR-001).</summary>
public interface IRepositorioFragmentos
{
    /// <summary>El catálogo ya validado. Se carga una sola vez.</summary>
    CatalogoDeMensajes ObtenerCatalogo();
}
