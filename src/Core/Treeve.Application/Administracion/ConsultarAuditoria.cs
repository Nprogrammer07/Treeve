using Treeve.Application.Identidad;
using Treeve.Domain.Comun;
using Treeve.Domain.Identidad;
using Treeve.Domain.Services.Administracion;
using Treeve.Domain.Services.Identidad;

namespace Treeve.Application.Administracion;

public sealed record PaginaDeAuditoria<T>(IReadOnlyList<T> Registros, bool HayMas);

/// <summary>
/// HU-12: el administrador lee los logs de auditoría, del más reciente al más antiguo: los cambios de rol (HU-12) y los
/// accesos denegados a rutas de staff o administración (HU-10). Solo lectura: los logs no se pueden cambiar.
/// </summary>
public sealed class ConsultarAuditoria(AutorizarAcceso autorizar, IRepositorioCambiosDeRol cambios, IRepositorioAuditoria accesos)
{
    public const int LimitePorDefecto = 50;
    public const int LimiteMaximo = 100;

    public async Task<PaginaDeAuditoria<CambioDeRolConNombres>> CambiosDeRol(
        Guid administradorId, ContextoDeAcceso contexto, int? limite, int? desplazamiento, CancellationToken ct)
    {
        await autorizar.Ejecutar(administradorId, Rol.Administrador, contexto, ct);
        var (tamano, salto) = Paginar(limite, desplazamiento);

        // Se pide una fila de más: si llega, hay otra página, y no hace falta contar toda la tabla.
        var filas = await cambios.Listar(tamano + 1, salto, ct);
        return new PaginaDeAuditoria<CambioDeRolConNombres>([.. filas.Take(tamano)], filas.Count > tamano);
    }

    public async Task<PaginaDeAuditoria<AccesoDenegadoConNombre>> AccesosDenegados(
        Guid administradorId, ContextoDeAcceso contexto, int? limite, int? desplazamiento, CancellationToken ct)
    {
        await autorizar.Ejecutar(administradorId, Rol.Administrador, contexto, ct);
        var (tamano, salto) = Paginar(limite, desplazamiento);

        var filas = await accesos.Listar(tamano + 1, salto, ct);
        return new PaginaDeAuditoria<AccesoDenegadoConNombre>([.. filas.Take(tamano)], filas.Count > tamano);
    }

    private static (int Limite, int Desplazamiento) Paginar(int? limite, int? desplazamiento)
    {
        var tamano = limite ?? LimitePorDefecto;
        var salto = desplazamiento ?? 0;

        if (tamano is < 1 or > LimiteMaximo)
        {
            throw new ExcepcionDeDominio($"El límite debe estar entre 1 y {LimiteMaximo}.");
        }

        if (salto < 0)
        {
            throw new ExcepcionDeDominio("El desplazamiento no puede ser negativo.");
        }

        return (tamano, salto);
    }
}
