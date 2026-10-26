using Treeve.Domain.Identidad;

namespace Treeve.Domain.Services.Identidad;

/// <summary>
/// Auditoría de accesos (HU-10). A propósito solo se puede agregar: el registro no se corrige ni se borra desde
/// el código de la aplicación.
/// </summary>
public interface IRepositorioAuditoria
{
    Task Registrar(AccesoNoAutorizado acceso, CancellationToken ct);
}
