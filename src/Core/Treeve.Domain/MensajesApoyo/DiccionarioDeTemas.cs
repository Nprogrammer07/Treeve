namespace Treeve.Domain.MensajesApoyo;

/// <summary>Palabras clave de cada tema. Detecta de qué habla el desahogo para elegir el reflejo.</summary>
public sealed class DiccionarioDeTemas
{
    private readonly IReadOnlyList<(Tema Tema, IReadOnlyList<PatronDeTexto> Patrones)> temas;

    public DiccionarioDeTemas(IReadOnlyDictionary<Tema, IReadOnlyList<string>> palabrasClave)
    {
        ArgumentNullException.ThrowIfNull(palabrasClave);

        temas = palabrasClave
            .OrderBy(par => par.Key)
            .Select(par => (par.Key, (IReadOnlyList<PatronDeTexto>)par.Value.Select(PatronDeTexto.Crear).ToList()))
            .ToList();
    }

    /// <summary>
    /// El tema con más palabras clave en el texto, o null si no aparece ninguno. Si hay empate gana el que
    /// va primero en <see cref="Tema"/>, para que el resultado no dependa del azar.
    /// </summary>
    public Tema? Detectar(TextoNormalizado texto)
    {
        ArgumentNullException.ThrowIfNull(texto);

        Tema? elegido = null;
        var mejor = 0;
        foreach (var (tema, patrones) in temas)
        {
            var coincidencias = patrones.Sum(texto.ContarCoincidencias);
            if (coincidencias > mejor)
            {
                elegido = tema;
                mejor = coincidencias;
            }
        }

        return elegido;
    }
}
