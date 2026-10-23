using Treeve.Domain.Comun;

namespace Treeve.Domain.Tests.Comun;

public class EventosDeDominioTests
{
    private static readonly Type[] TiposPermitidos = [typeof(Guid), typeof(DateTimeOffset), typeof(bool), typeof(int)];

    private static readonly List<Type> Eventos =
        [.. typeof(IEventoDeDominio).Assembly.GetTypes().Where(t => t is { IsClass: true, IsAbstract: false } && t.IsAssignableTo(typeof(IEventoDeDominio)))];

    [Fact]
    public void Hay_eventos_que_revisar()
    {
        Assert.NotEmpty(Eventos);
    }

    [Fact]
    public void Los_eventos_llevan_solo_ids_y_metadatos_nunca_texto()
    {
        // CLAUDE.md: "los eventos llevan solo IDs y metadatos, nunca el texto". Un string o un arreglo en un
        // evento es la puerta por la que se colaría el texto de un desahogo; esta prueba la cierra.
        var conTexto = Eventos
            .SelectMany(e => e.GetProperties().Select(p => (Evento: e.Name, Propiedad: p.Name, p.PropertyType)))
            .Where(p => !TiposPermitidos.Contains(p.PropertyType) && !p.PropertyType.IsEnum)
            .Select(p => $"{p.Evento}.{p.Propiedad} ({p.PropertyType.Name})")
            .ToList();

        Assert.True(
            conTexto.Count == 0,
            "Estas propiedades de eventos no son ids ni metadatos simples: " + string.Join(", ", conTexto) + ".");
    }
}
