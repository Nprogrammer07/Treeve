using Treeve.Domain.Services.Sugerencias;
using Treeve.Domain.Sugerencias;

namespace Treeve.Application.Sugerencias;

public sealed record SugerenciaPropia(Guid SugerenciaId, string Texto, EstadoSugerencia Estado, DateTimeOffset CreadaEn)
{
    // El texto es libre y puede incluir datos personales: no se imprime.
    public override string ToString() => "[sugerencia]";
}

/// <summary>HU-09: el historial propio. Solo devuelve las sugerencias de la persona con sesión, nunca las de otra.</summary>
public sealed class ListarMisSugerencias(IRepositorioSugerencias sugerencias)
{
    /// <summary>Tope de seguridad: ninguna persona llega a esto en la práctica, pero la respuesta no crece sin límite.</summary>
    public const int MaximoEnHistorial = 200;

    public async Task<IReadOnlyList<SugerenciaPropia>> Ejecutar(Guid usuarioId, CancellationToken ct)
    {
        var propias = await sugerencias.ListarDeUsuario(usuarioId, MaximoEnHistorial, ct);

        return [.. propias
            .Where(s => s.PerteneceA(usuarioId)) // defensa extra: el repositorio ya filtra por persona
            .Select(s => new SugerenciaPropia(s.Id, s.Texto, s.Estado, s.CreadaEn))];
    }
}
