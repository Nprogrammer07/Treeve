using System.Text.RegularExpressions;
using Treeve.Domain.Desahogos;

namespace Treeve.Domain.MensajesApoyo;

/// <summary>
/// Frase escrita por el equipo que llena una ranura del mensaje (ADR-001). Es contenido, no código: vive en
/// el JSON de Infrastructure. Sus etiquetas dicen cuándo encaja; sin etiqueta, encaja en cualquier caso.
/// </summary>
public sealed partial class Fragmento
{
    public const string MarcadorDeApodo = "{apodo}";
    public const int PesoMaximo = 10;
    public const int TextoMaximo = 300;

    private static readonly IReadOnlyDictionary<Ranura, string> CodigoDeRanura = new Dictionary<Ranura, string>
    {
        [Ranura.Saludo] = "SAL",
        [Ranura.Validacion] = "VAL",
        [Ranura.Reflejo] = "REF",
        [Ranura.Contraste] = "CON",
        [Ranura.Puente] = "PUE",
    };

    private static readonly IReadOnlyDictionary<Emocion, string> CodigoDeEmocion = new Dictionary<Emocion, string>
    {
        [Desahogos.Emocion.Tristeza] = "TRI",
        [Desahogos.Emocion.Rabia] = "RAB",
        [Desahogos.Emocion.Miedo] = "MIE",
        [Desahogos.Emocion.Duda] = "DUD",
        [Desahogos.Emocion.Felicidad] = "FEL",
    };

    private const string CodigoGeneral = "GEN";

    private Fragmento(
        string id,
        Ranura ranura,
        Emocion? emocion,
        IReadOnlySet<Tema> temas,
        IReadOnlySet<Intensidad> intensidades,
        int peso,
        string texto)
    {
        Id = id;
        Ranura = ranura;
        Emocion = emocion;
        Temas = temas;
        Intensidades = intensidades;
        Peso = peso;
        Texto = texto;
    }

    /// <summary>Por ejemplo "TRI-REF-07": emoción (o GEN si sirve para todas), ranura y número.</summary>
    public string Id { get; }
    public Ranura Ranura { get; }

    /// <summary>null: sirve para cualquier emoción.</summary>
    public Emocion? Emocion { get; }

    /// <summary>Vacío: no depende del tema.</summary>
    public IReadOnlySet<Tema> Temas { get; }

    /// <summary>Vacío: sirve para cualquier intensidad.</summary>
    public IReadOnlySet<Intensidad> Intensidades { get; }

    /// <summary>Entre más peso, más probable es que se elija frente a otros igual de específicos.</summary>
    public int Peso { get; }
    public string Texto { get; }

    /// <summary>
    /// De lo general a lo específico: la emoción suma 1, el tema 2 y la intensidad 1. Entre los fragmentos
    /// que encajan, el motor prefiere los más específicos.
    /// </summary>
    public int Especificidad => (Emocion is null ? 0 : 1) + (Temas.Count > 0 ? 2 : 0) + (Intensidades.Count > 0 ? 1 : 0);

    public static Fragmento Crear(
        string id,
        Ranura ranura,
        Emocion? emocion,
        IEnumerable<Tema> temas,
        IEnumerable<Intensidad> intensidades,
        int peso,
        string texto)
    {
        ArgumentNullException.ThrowIfNull(temas);
        ArgumentNullException.ThrowIfNull(intensidades);

        var prefijo = $"{(emocion is { } e ? CodigoDeEmocion[e] : CodigoGeneral)}-{CodigoDeRanura[ranura]}-";
        if (id is null || !FormatoDeId().IsMatch(id) || !id.StartsWith(prefijo, StringComparison.Ordinal))
        {
            throw new ArgumentException($"El fragmento \"{id}\" debe tener un id con la forma {prefijo}NN.", nameof(id));
        }

        if (peso is < 1 or > PesoMaximo)
        {
            throw new ArgumentException($"El peso del fragmento {id} debe estar entre 1 y {PesoMaximo}.", nameof(peso));
        }

        var limpio = (texto ?? string.Empty).Trim();
        if (limpio.Length is 0 or > TextoMaximo)
        {
            throw new ArgumentException($"El texto del fragmento {id} debe tener entre 1 y {TextoMaximo} caracteres.", nameof(texto));
        }

        // Cada fragmento es una oración completa: así encaja con cualquier vecino de ranura.
        if (!limpio.EndsWith('.') && !limpio.EndsWith('!') && !limpio.EndsWith('?'))
        {
            throw new ArgumentException($"El texto del fragmento {id} debe terminar en punto, ! o ?.", nameof(texto));
        }

        if (!SoloUsaElMarcadorDeApodo(limpio))
        {
            throw new ArgumentException($"El fragmento {id} solo puede usar el marcador {MarcadorDeApodo}.", nameof(texto));
        }

        if (ranura == Ranura.Saludo && !limpio.Contains(MarcadorDeApodo, StringComparison.Ordinal))
        {
            throw new ArgumentException($"El saludo {id} debe nombrar a la persona con {MarcadorDeApodo}.", nameof(texto));
        }

        return new Fragmento(id, ranura, emocion, temas.ToHashSet(), intensidades.ToHashSet(), peso, limpio);
    }

    public bool EncajaCon(Senales senales)
    {
        ArgumentNullException.ThrowIfNull(senales);

        return (Emocion is null || Emocion == senales.Emocion)
            && (Temas.Count == 0 || (senales.Tema is { } tema && Temas.Contains(tema)))
            && (Intensidades.Count == 0 || Intensidades.Contains(senales.Intensidad));
    }

    /// <summary>Sin tema ni intensidad: encaja con cualquier desahogo de esa emoción.</summary>
    public bool EsGeneralPara(Emocion emocion) =>
        (Emocion is null || Emocion == emocion) && Temas.Count == 0 && Intensidades.Count == 0;

    public string TextoPara(string apodo) => Texto.Replace(MarcadorDeApodo, apodo, StringComparison.Ordinal);

    /// <summary>Las llaves solo pueden aparecer como parte de {apodo}.</summary>
    public static bool SoloUsaElMarcadorDeApodo(string texto)
    {
        ArgumentNullException.ThrowIfNull(texto);

        var sinMarcador = texto.Replace(MarcadorDeApodo, string.Empty, StringComparison.Ordinal);
        return !sinMarcador.Contains('{', StringComparison.Ordinal) && !sinMarcador.Contains('}', StringComparison.Ordinal);
    }

    public override string ToString() => Id;

    [GeneratedRegex(@"^[A-Z]{3}-[A-Z]{3}-\d{2}$")]
    private static partial Regex FormatoDeId();
}
