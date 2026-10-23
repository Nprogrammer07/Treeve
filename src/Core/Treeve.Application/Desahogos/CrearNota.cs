using Treeve.Application.Comun;
using Treeve.Domain.Desahogos;
using Treeve.Domain.Services.Desahogos;

namespace Treeve.Application.Desahogos;

public sealed record CrearNotaComando(Emocion Emocion, string? Texto)
{
    // Los records imprimen todas sus propiedades; aquí se oculta el texto.
    public override string ToString() => $"CrearNotaComando {{ Emocion = {Emocion} }}";
}

public sealed record NotaGuardada(Guid NotaId, DateTimeOffset CreadaEn);

/// <summary>Cómo se ata el texto cifrado de una nota a su fila y a su dueña: copiado a otra no se descifra.</summary>
public static class ContextoDeNotas
{
    public static string Para(Guid notaId, Guid usuarioId) => $"desahogos.texto:{notaId}:{usuarioId}";
}

/// <summary>
/// HU-05: guarda un desahogo cifrado y avisa al resto del sistema con <see cref="NotaCreada"/> (TEC-03).
/// El texto solo se usa en memoria: se valida, se cifra y se descarta. La persona sale de la sesión, no de la petición.
/// </summary>
public sealed class CrearNota(
    IRepositorioNotas notas,
    ICifradorDeDatosSensibles cifrador,
    IReloj reloj,
    IPublicadorEventos eventos)
{
    public async Task<NotaGuardada> Ejecutar(Guid usuarioId, CrearNotaComando comando, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(comando);

        var texto = TextoDesahogo.Crear(comando.Texto);
        var id = Guid.NewGuid();
        var cifrado = cifrador.Cifrar(texto.Valor, ContextoDeNotas.Para(id, usuarioId));
        var nota = Nota.Crear(id, usuarioId, comando.Emocion, cifrado, reloj.Ahora);

        await notas.Agregar(nota, ct);
        await eventos.Publicar(nota.Creada(), ct);

        return new NotaGuardada(nota.Id, nota.CreadaEn);
    }
}
