using Treeve.Domain.Comun;

namespace Treeve.Domain.Desahogos;

/// <summary>Texto en claro de un desahogo. Solo vive en memoria: se cifra antes de guardarse.</summary>
public sealed class TextoDesahogo
{
    /// <summary>Límite de caracteres de HU-05. El frontend muestra el mismo número (HojaDePapel), pero decide el backend.</summary>
    public const int LongitudMaxima = 2000;

    public string Valor { get; }

    private TextoDesahogo(string valor) => Valor = valor;

    public static TextoDesahogo Crear(string? texto)
    {
        if (string.IsNullOrWhiteSpace(texto))
        {
            throw new ExcepcionDeDominio("El desahogo no puede estar vacío.");
        }

        if (texto.Length > LongitudMaxima)
        {
            throw new ExcepcionDeDominio($"El desahogo supera los {LongitudMaxima} caracteres.");
        }

        return new TextoDesahogo(texto);
    }

    // Privacidad: si alguien lo escribe en un log por error, no se filtra el contenido.
    public override string ToString() => "[desahogo]";
}
