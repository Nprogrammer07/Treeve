using Treeve.Application.Comun;
using Treeve.Domain.Desahogos;
using Treeve.Domain.Services.Desahogos;

namespace Treeve.Application.Desahogos;

public sealed record NotaLeida(Guid NotaId, Emocion Emocion, string Texto, DateTimeOffset CreadaEn)
{
    // Lleva el texto del desahogo: nunca se imprime.
    public override string ToString() => "[nota leída]";
}

/// <summary>
/// HU-05 (RNF de seguridad): solo la persona dueña lee su desahogo. No existe una vía para el staff ni para un
/// administrador: la autorización vive aquí, no en el endpoint ni en el frontend.
/// </summary>
public sealed class LeerNota(IRepositorioNotas notas, ICifradorDeDatosSensibles cifrador)
{
    public async Task<NotaLeida> Ejecutar(Guid usuarioId, Guid notaId, CancellationToken ct)
    {
        var nota = await notas.ObtenerPorId(notaId, ct);

        // Mismo error si no existe o si es de otra persona, para no revelar que existe.
        if (nota is null || !nota.PerteneceA(usuarioId))
        {
            throw new AccesoDenegado();
        }

        var texto = cifrador.Descifrar(nota.TextoCifrado, ContextoDeNotas.Para(nota.Id, nota.UsuarioId));

        return new NotaLeida(nota.Id, nota.Emocion, texto, nota.CreadaEn);
    }
}
