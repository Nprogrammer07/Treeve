using System.Reflection;
using System.Text.Json;
using Treeve.Domain.Desahogos;
using Treeve.Domain.MensajesApoyo;
using Treeve.Domain.Services.MensajesApoyo;

namespace Treeve.Infrastructure.MensajesApoyo;

/// <summary>
/// Lee el contenido de los mensajes de apoyo desde los JSON de Contenido/ (ADR-001), que viajan dentro del
/// ensamblado. Se carga y valida una sola vez; un contenido inválido falla en las pruebas, no en producción.
/// </summary>
internal sealed class RepositorioFragmentosJson : IRepositorioFragmentos
{
    private const string Recursos = "Treeve.Infrastructure.MensajesApoyo.Contenido.";

    private static readonly JsonSerializerOptions Opciones = new() { PropertyNameCaseInsensitive = true };

    private static readonly IReadOnlyDictionary<string, Ranura> Ranuras = new Dictionary<string, Ranura>
    {
        ["saludo"] = Ranura.Saludo,
        ["validación"] = Ranura.Validacion,
        ["reflejo"] = Ranura.Reflejo,
        ["contraste"] = Ranura.Contraste,
        ["puente"] = Ranura.Puente,
    };

    private static readonly IReadOnlyDictionary<string, Emocion> Emociones = new Dictionary<string, Emocion>
    {
        ["tristeza"] = Emocion.Tristeza,
        ["rabia"] = Emocion.Rabia,
        ["miedo"] = Emocion.Miedo,
        ["duda"] = Emocion.Duda,
        ["felicidad"] = Emocion.Felicidad,
    };

    private static readonly IReadOnlyDictionary<string, Tema> Temas = new Dictionary<string, Tema>
    {
        ["trabajo"] = Tema.Trabajo,
        ["estudio"] = Tema.Estudio,
        ["familia"] = Tema.Familia,
        ["pareja"] = Tema.Pareja,
        ["amistad"] = Tema.Amistad,
        ["salud"] = Tema.Salud,
        ["dinero"] = Tema.Dinero,
    };

    private static readonly IReadOnlyDictionary<string, Intensidad> Intensidades = new Dictionary<string, Intensidad>
    {
        ["baja"] = Intensidad.Baja,
        ["media"] = Intensidad.Media,
        ["alta"] = Intensidad.Alta,
    };

    private readonly Lazy<CatalogoDeMensajes> catalogo = new(Cargar);

    public CatalogoDeMensajes ObtenerCatalogo() => catalogo.Value;

    internal static CatalogoDeMensajes Cargar()
    {
        var fragmentos = Leer<ArchivoDeFragmentos>("fragmentos.json").Fragmentos.Select(ACrear);
        var temas = Leer<ArchivoDeTemas>("temas.json");
        var crisis = Leer<ArchivoDeCrisis>("crisis.json");

        var diccionario = new DiccionarioDeTemas(temas.Temas.ToDictionary(
            par => Traducir(Temas, par.Key, "temas.json"),
            par => (IReadOnlyList<string>)par.Value));

        return CatalogoDeMensajes.Crear(
            fragmentos,
            diccionario,
            new ReglaCrisis(crisis.Frases.Values.SelectMany(frases => frases), crisis.Excepciones),
            crisis.Mensaje);
    }

    private static Fragmento ACrear(FragmentoJson f) =>
        Fragmento.Crear(
            f.Id,
            Traducir(Ranuras, f.Ranura, f.Id),
            f.Emocion is null ? null : Traducir(Emociones, f.Emocion, f.Id),
            (f.Temas ?? []).Select(t => Traducir(Temas, t, f.Id)),
            (f.Intensidad ?? []).Select(i => Traducir(Intensidades, i, f.Id)),
            f.Peso ?? 1,
            f.Texto);

    private static T Traducir<T>(IReadOnlyDictionary<string, T> valores, string valor, string dondeAparece) =>
        valores.TryGetValue(valor, out var traducido)
            ? traducido
            : throw new InvalidOperationException(
                $"\"{valor}\" no es un valor válido en {dondeAparece}. Valores posibles: {string.Join(", ", valores.Keys)}.");

    private static T Leer<T>(string archivo)
    {
        using var flujo = Assembly.GetExecutingAssembly().GetManifestResourceStream(Recursos + archivo)
            ?? throw new InvalidOperationException($"No se encontró el contenido {archivo} dentro del ensamblado.");

        return JsonSerializer.Deserialize<T>(flujo, Opciones)
            ?? throw new InvalidOperationException($"El contenido {archivo} está vacío.");
    }

    private sealed record ArchivoDeFragmentos(IReadOnlyList<FragmentoJson> Fragmentos);

    private sealed record FragmentoJson(
        string Id,
        string Ranura,
        string? Emocion,
        IReadOnlyList<string>? Temas,
        IReadOnlyList<string>? Intensidad,
        int? Peso,
        string Texto);

    private sealed record ArchivoDeTemas(IReadOnlyDictionary<string, IReadOnlyList<string>> Temas);

    /// <param name="Frases">Agrupadas por categoría para que la revisión psicológica sea más fácil.</param>
    private sealed record ArchivoDeCrisis(
        IReadOnlyDictionary<string, IReadOnlyList<string>> Frases,
        IReadOnlyList<string> Excepciones,
        string Mensaje);
}
