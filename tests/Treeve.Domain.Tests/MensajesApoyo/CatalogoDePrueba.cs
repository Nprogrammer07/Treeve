using Treeve.Domain.Desahogos;
using Treeve.Domain.MensajesApoyo;

namespace Treeve.Domain.Tests.MensajesApoyo;

/// <summary>
/// Catálogo pequeño y predecible: 6 fragmentos generales por emoción y ranura (uno más que las respuestas
/// sin repetir), un reflejo del tema familia y una validación de intensidad alta para tristeza.
/// </summary>
internal static class CatalogoDePrueba
{
    public const int GeneralesPorRanura = 6;
    public const string ReflejoDeFamilia = "GEN-REF-01";
    public const string ValidacionIntensaDeTristeza = "TRI-VAL-07";
    public const string MensajeDeCrisis = "{apodo}, este es el mensaje fijo de crisis.";

    public static readonly IReadOnlyDictionary<Emocion, string> Codigo = new Dictionary<Emocion, string>
    {
        [Emocion.Tristeza] = "TRI",
        [Emocion.Rabia] = "RAB",
        [Emocion.Miedo] = "MIE",
        [Emocion.Duda] = "DUD",
        [Emocion.Felicidad] = "FEL",
    };

    private static readonly IReadOnlyDictionary<Ranura, string> CodigoDeRanura = new Dictionary<Ranura, string>
    {
        [Ranura.Validacion] = "VAL",
        [Ranura.Reflejo] = "REF",
        [Ranura.Contraste] = "CON",
        [Ranura.Puente] = "PUE",
    };

    public static CatalogoDeMensajes Crear() =>
        CatalogoDeMensajes.Crear(Fragmentos(), Temas(), Crisis(), MensajeDeCrisis);

    public static List<Fragmento> Fragmentos()
    {
        var fragmentos = Enumerable.Range(1, GeneralesPorRanura)
            .Select(i => Fragmento.Crear($"GEN-SAL-{i:00}", Ranura.Saludo, null, [], [], 1, $"Hola {Fragmento.MarcadorDeApodo} {i}."))
            .ToList();

        foreach (var (emocion, codigo) in Codigo)
        {
            foreach (var (ranura, codigoDeRanura) in CodigoDeRanura)
            {
                fragmentos.AddRange(Enumerable.Range(1, GeneralesPorRanura).Select(i =>
                    Fragmento.Crear($"{codigo}-{codigoDeRanura}-{i:00}", ranura, emocion, [], [], 1, $"{emocion} {ranura} {i}.")));
            }
        }

        fragmentos.Add(Fragmento.Crear(ReflejoDeFamilia, Ranura.Reflejo, null, [Tema.Familia], [], 1, "Reflejo de familia."));
        fragmentos.Add(Fragmento.Crear(
            ValidacionIntensaDeTristeza, Ranura.Validacion, Emocion.Tristeza, [], [Intensidad.Alta], 1, "Validación intensa."));

        return fragmentos;
    }

    public static DiccionarioDeTemas Temas() =>
        new(new Dictionary<Tema, IReadOnlyList<string>>
        {
            [Tema.Familia] = ["mamá", "papá", "herman*"],
            [Tema.Trabajo] = ["trabaj*", "jefe"],
        });

    public static ReglaCrisis Crisis() => new(["quiero morir*", "me voy a matar"], ["morir* de risa", "mat* estudiando"]);
}
