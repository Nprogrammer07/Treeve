using Treeve.Domain.Desahogos;

namespace Treeve.Domain.MensajesApoyo;

/// <summary>
/// Todo el contenido del motor: fragmentos, palabras clave de los temas y la regla y el mensaje de crisis.
/// Al crearse comprueba que cada emoción tenga en cada ranura al menos un fragmento general, para que el
/// mensaje nunca quede sin respuesta (ADR-001, paso 5).
/// </summary>
public sealed class CatalogoDeMensajes
{
    private readonly IReadOnlyDictionary<Ranura, IReadOnlyList<Fragmento>> porRanura;

    private CatalogoDeMensajes(
        IReadOnlyList<Fragmento> fragmentos,
        DiccionarioDeTemas temas,
        ReglaCrisis crisis,
        string mensajeDeCrisis)
    {
        Fragmentos = fragmentos;
        Temas = temas;
        Crisis = crisis;
        MensajeDeCrisis = mensajeDeCrisis;
        porRanura = Enum.GetValues<Ranura>()
            .ToDictionary(ranura => ranura, ranura => (IReadOnlyList<Fragmento>)fragmentos.Where(f => f.Ranura == ranura).ToList());
    }

    public IReadOnlyList<Fragmento> Fragmentos { get; }
    public DiccionarioDeTemas Temas { get; }
    public ReglaCrisis Crisis { get; }

    /// <summary>Mensaje fijo que se muestra ante señales de crisis. Nunca se compone.</summary>
    public string MensajeDeCrisis { get; }

    public static CatalogoDeMensajes Crear(
        IEnumerable<Fragmento> fragmentos,
        DiccionarioDeTemas temas,
        ReglaCrisis crisis,
        string mensajeDeCrisis)
    {
        ArgumentNullException.ThrowIfNull(fragmentos);
        ArgumentNullException.ThrowIfNull(temas);
        ArgumentNullException.ThrowIfNull(crisis);

        var lista = fragmentos.ToList();

        var repetidos = lista.GroupBy(f => f.Id).Where(g => g.Count() > 1).Select(g => g.Key).ToList();
        if (repetidos.Count > 0)
        {
            throw new ArgumentException($"Hay fragmentos con el mismo id: {string.Join(", ", repetidos)}.", nameof(fragmentos));
        }

        var faltantes = (
            from emocion in Enum.GetValues<Emocion>()
            from ranura in Enum.GetValues<Ranura>()
            where !lista.Any(f => f.Ranura == ranura && f.EsGeneralPara(emocion))
            select $"{emocion}/{ranura}").ToList();
        if (faltantes.Count > 0)
        {
            throw new ArgumentException(
                $"Falta al menos un fragmento general (sin tema ni intensidad) para: {string.Join(", ", faltantes)}.", nameof(fragmentos));
        }

        var mensaje = (mensajeDeCrisis ?? string.Empty).Trim();
        if (mensaje.Length == 0 || !Fragmento.SoloUsaElMarcadorDeApodo(mensaje))
        {
            throw new ArgumentException(
                $"El mensaje de crisis no puede estar vacío y solo admite el marcador {Fragmento.MarcadorDeApodo}.", nameof(mensajeDeCrisis));
        }

        return new CatalogoDeMensajes(lista, temas, crisis, mensaje);
    }

    public IReadOnlyList<Fragmento> DeLaRanura(Ranura ranura) => porRanura[ranura];

    public string MensajeDeCrisisPara(string apodo) =>
        MensajeDeCrisis.Replace(Fragmento.MarcadorDeApodo, apodo, StringComparison.Ordinal);
}
