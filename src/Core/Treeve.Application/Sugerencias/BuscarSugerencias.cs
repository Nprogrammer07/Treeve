using Treeve.Application.Identidad;
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
/// La autorización vive aquí, como en <c>LeerNota</c>: antes de validar o buscar, <see cref="AutorizarAcceso"/> (HU-10)
/// exige rol de staff o administración, lee el rol de la base de datos y, si no alcanza, deja el intento en la auditoría.
/// Así el listado no queda abierto si algún día se llama desde otra ruta. La ruta <c>/api/staff</c> además lleva el
/// filtro <c>RequiereRol</c>, como segunda barrera.
/// </summary>
public sealed class BuscarSugerencias(AutorizarAcceso autorizar, IRepositorioSugerencias sugerencias)
{
    public const int LimitePorDefecto = 50;
    public const int LimiteMaximo = 100;

    public async Task<PaginaDeSugerencias> Ejecutar(
        Guid usuarioId, ContextoDeAcceso contexto, BuscarSugerenciasComando comando, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(comando);

        // Primero se autoriza: quien no es staff no llega a que se le validen los filtros ni a la base de datos.
        await autorizar.Ejecutar(usuarioId, Rol.Staff, contexto, ct);

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
