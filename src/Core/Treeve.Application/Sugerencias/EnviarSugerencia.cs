using Treeve.Application.Comun;
using Treeve.Domain.Services.Sugerencias;
using Treeve.Domain.Sugerencias;

namespace Treeve.Application.Sugerencias;

public sealed record EnviarSugerenciaComando(string? Texto)
{
    // Los records imprimen todas sus propiedades; aquí se oculta el texto.
    public override string ToString() => "[enviar sugerencia]";
}

public sealed record SugerenciaEnviada(Guid SugerenciaId, DateTimeOffset CreadaEn, EstadoSugerencia Estado);

/// <summary>HU-09: una persona con sesión propone una funcionalidad. La persona sale de la sesión, no de la petición.</summary>
public sealed class EnviarSugerencia(IRepositorioSugerencias sugerencias, IReloj reloj)
{
    public async Task<SugerenciaEnviada> Ejecutar(Guid usuarioId, EnviarSugerenciaComando comando, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(comando);

        var sugerencia = Sugerencia.Enviar(usuarioId, TextoSugerencia.Crear(comando.Texto), reloj.Ahora);

        await sugerencias.Agregar(sugerencia, ct);

        return new SugerenciaEnviada(sugerencia.Id, sugerencia.CreadaEn, sugerencia.Estado);
    }
}
