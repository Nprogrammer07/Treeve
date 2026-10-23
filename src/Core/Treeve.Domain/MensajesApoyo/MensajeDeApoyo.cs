namespace Treeve.Domain.MensajesApoyo;

/// <summary>Mensaje que recibe la persona al guardar su desahogo (HU-06).</summary>
public sealed class MensajeDeApoyo
{
    private MensajeDeApoyo(string texto, IReadOnlyList<string> fragmentosUsados, bool esDeCrisis)
    {
        Texto = texto;
        FragmentosUsados = fragmentosUsados;
        EsDeCrisis = esDeCrisis;
    }

    public string Texto { get; }

    /// <summary>Ids de los fragmentos, en orden de ranura. Vacío si es de crisis.</summary>
    public IReadOnlyList<string> FragmentosUsados { get; }

    /// <summary>Se respondió con el mensaje fijo de crisis. Solo se usa en esta respuesta: nunca se guarda.</summary>
    public bool EsDeCrisis { get; }

    /// <summary>Une las 5 ranuras en orden: cada fragmento es una oración completa.</summary>
    public static MensajeDeApoyo Compuesto(IReadOnlyList<Fragmento> fragmentos, string apodo)
    {
        ArgumentNullException.ThrowIfNull(fragmentos);

        var ranuras = Enum.GetValues<Ranura>();
        if (!fragmentos.Select(f => f.Ranura).SequenceEqual(ranuras))
        {
            throw new ArgumentException("Un mensaje lleva un fragmento por ranura, en orden.", nameof(fragmentos));
        }

        return new MensajeDeApoyo(
            string.Join(' ', fragmentos.Select(f => f.TextoPara(apodo))),
            fragmentos.Select(f => f.Id).ToList(),
            esDeCrisis: false);
    }

    public static MensajeDeApoyo DeCrisis(string texto)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(texto);

        return new MensajeDeApoyo(texto, [], esDeCrisis: true);
    }

    // El reflejo delata el tema del desahogo: nunca se imprime.
    public override string ToString() => "[mensaje de apoyo]";
}
