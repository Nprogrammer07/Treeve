using Treeve.Application.Comun;
using Treeve.Application.Identidad;
using Treeve.Domain.Comun;
using Treeve.Domain.Identidad;
using Treeve.Domain.Services.Sugerencias;
using Treeve.Domain.Sugerencias;

namespace Treeve.Application.Sugerencias;

/// <param name="Comentario">Null deja el comentario como está; un texto vacío lo quita.</param>
public sealed record GestionarSugerenciaComando(Guid SugerenciaId, EstadoSugerencia? Estado, string? Comentario)
{
    // El comentario es texto libre: no se imprime.
    public override string ToString() => $"GestionarSugerenciaComando {{ SugerenciaId = {SugerenciaId}, Estado = {Estado} }}";
}

/// <summary>Cómo quedó la sugerencia. <paramref name="HuboCambios"/> es false si el staff envió lo mismo que ya tenía.</summary>
public sealed record SugerenciaGestionadaResultado(
    Guid SugerenciaId,
    EstadoSugerencia Estado,
    string? Comentario,
    DateTimeOffset? GestionadaEn,
    bool HuboCambios)
{
    public override string ToString() => $"SugerenciaGestionadaResultado {{ SugerenciaId = {SugerenciaId}, Estado = {Estado}, HuboCambios = {HuboCambios} }}";
}

/// <summary>
/// HU-11: el staff cambia el estado de una sugerencia, le deja un comentario visible para quien la envió, o ambas cosas.
/// Como en <see cref="BuscarSugerencias"/>, la autorización vive aquí: <see cref="AutorizarAcceso"/> exige rol de staff o
/// administración (leído de la base de datos) y registra el intento si no alcanza. Si algo cambió, publica
/// <see cref="SugerenciaGestionada"/> para avisarle a la persona; si el aviso falla, el cambio ya quedó guardado (TEC-03).
/// </summary>
public sealed class GestionarSugerencia(
    AutorizarAcceso autorizar,
    IRepositorioSugerencias sugerencias,
    IPublicadorEventos eventos,
    IReloj reloj)
{
    public async Task<SugerenciaGestionadaResultado> Ejecutar(
        Guid staffId, ContextoDeAcceso contexto, GestionarSugerenciaComando comando, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(comando);

        // Primero se autoriza: quien no es staff no llega a saber si la sugerencia existe.
        await autorizar.Ejecutar(staffId, Rol.Staff, contexto, ct);

        var comentario = comando.Comentario is null ? null : ComentarioDelStaff.Crear(comando.Comentario);

        var sugerencia = await sugerencias.ObtenerPorId(comando.SugerenciaId, ct)
            ?? throw new ExcepcionDeDominio("La sugerencia no existe.");

        var evento = sugerencia.Gestionar(staffId, comando.Estado, comentario, reloj.Ahora);

        if (evento is not null)
        {
            await sugerencias.Guardar(sugerencia, ct);
            await eventos.Publicar(evento, ct);
        }

        return new SugerenciaGestionadaResultado(
            sugerencia.Id, sugerencia.Estado, sugerencia.Comentario, sugerencia.GestionadaEn, evento is not null);
    }
}
