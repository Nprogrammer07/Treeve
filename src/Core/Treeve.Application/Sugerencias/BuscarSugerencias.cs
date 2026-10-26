using Treeve.Domain.Comun;
using Treeve.Domain.Identidad;
using Treeve.Domain.Services.Sugerencias;
using Treeve.Domain.Sugerencias;

namespace Treeve.Application.Sugerencias;

public sealed record BuscarSugerenciasComando(
    EstadoSugerencia? Estado,
    DateTimeOffset? Desde,
    DateTimeOffset? Hasta,
    string? NombreDeUsuario,
    int? Limite,
    int? Desplazamiento);

public sealed record PaginaDeSugerencias(IReadOnlyList<SugerenciaConAutor> Sugerencias, bool HayMas)
{
    public override string ToString() => $"PaginaDeSugerencias {{ Cantidad = {Sugerencias.Count}, HayMas = {HayMas} }}";
}

/// <summary>
/// HU-09 (RNF de mantenibilidad): el staff filtra las sugerencias por estado, fecha o usuario, con paginación.
/// La autorización (solo staff o administración) se valida en la ruta con <c>RequiereRol</c> (HU-10), que llama a
/// <c>AutorizarAcceso</c> en cada petición; este caso de uso solo se invoca desde esa zona.
/// </summary>
public sealed class BuscarSugerencias(IRepositorioSugerencias sugerencias)
{
    public const int LimitePorDefecto = 50;
    public const int LimiteMaximo = 100;

    public async Task<PaginaDeSugerencias> Ejecutar(BuscarSugerenciasComando comando, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(comando);

        var limite = comando.Limite ?? LimitePorDefecto;
        var desplazamiento = comando.Desplazamiento ?? 0;

        if (limite is < 1 or > LimiteMaximo)
        {
            throw new ExcepcionDeDominio($"El límite debe estar entre 1 y {LimiteMaximo}.");
        }

        if (desplazamiento < 0)
        {
            throw new ExcepcionDeDominio("El desplazamiento no puede ser negativo.");
        }

        if (comando.Estado is { } estado && !Enum.IsDefined(estado))
        {
            throw new ExcepcionDeDominio("El estado no es válido.");
        }

        if (comando.Desde is { } desde && comando.Hasta is { } hasta && desde >= hasta)
        {
            throw new ExcepcionDeDominio("La fecha 'desde' debe ser anterior a 'hasta'.");
        }

        var nombre = Usuario.NormalizarIdentificador(comando.NombreDeUsuario);

        // Se pide una fila de más: si llega, hay otra página, y no hace falta contar toda la tabla.
        var filas = await sugerencias.Buscar(
            new FiltroDeSugerencias(comando.Estado, comando.Desde, comando.Hasta, nombre.Length == 0 ? null : nombre, limite + 1, desplazamiento),
            ct);

        return new PaginaDeSugerencias([.. filas.Take(limite)], filas.Count > limite);
    }
}
