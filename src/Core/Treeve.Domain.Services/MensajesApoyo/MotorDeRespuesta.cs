using Treeve.Domain.MensajesApoyo;

namespace Treeve.Domain.Services.MensajesApoyo;

/// <summary>
/// Motor del grafo de composición (ADR-001, HU-06a-1). Es puro: no guarda nada y el azar llega como semilla.
/// <list type="number">
/// <item>Si hay señales de crisis, responde el mensaje fijo y termina.</item>
/// <item>Calcula las señales: emoción, tema e intensidad.</item>
/// <item>En cada ranura toma los fragmentos que encajan con las señales (la emoción define la rama).</item>
/// <item>Descarta los usados en las últimas <see cref="RespuestasSinRepetir"/> respuestas.</item>
/// <item>Se queda con los más específicos y elige uno al azar según su peso.</item>
/// <item>Une las 5 ranuras.</item>
/// </list>
/// </summary>
public sealed class MotorDeRespuesta(CatalogoDeMensajes catalogo) : IGeneradorMensajeApoyo
{
    /// <summary>HU-06: un fragmento no se repite en las 5 respuestas siguientes.</summary>
    public const int RespuestasSinRepetir = 5;

    public MensajeDeApoyo Generar(PeticionDeMensaje peticion)
    {
        ArgumentNullException.ThrowIfNull(peticion);

        var texto = TextoNormalizado.Desde(peticion.Texto);

        if (catalogo.Crisis.Detecta(texto))
        {
            return MensajeDeApoyo.DeCrisis(catalogo.MensajeDeCrisisPara(peticion.Apodo));
        }

        var senales = new Senales(
            peticion.Emocion,
            catalogo.Temas.Detectar(texto),
            MedidorDeIntensidad.Medir(peticion.Texto, texto));

        var recientes = peticion.FragmentosRecientes.ToList();
        var azar = new Random(peticion.Semilla);

        var elegidos = Enum.GetValues<Ranura>()
            .Select(ranura => Elegir(catalogo.DeLaRanura(ranura), senales, recientes, azar))
            .ToList();

        return MensajeDeApoyo.Compuesto(elegidos, peticion.Apodo);
    }

    private static Fragmento Elegir(IReadOnlyList<Fragmento> deLaRanura, Senales senales, List<string> recientes, Random azar)
    {
        // El catálogo garantiza al menos un fragmento general por emoción y ranura: nunca queda vacío.
        var candidatos = deLaRanura.Where(f => f.EncajaCon(senales)).ToList();
        var disponibles = candidatos.Where(f => !recientes.Contains(f.Id)).ToList();

        if (disponibles.Count == 0)
        {
            // Todavía no hay suficiente contenido: se repite el que se usó hace más tiempo.
            return candidatos.MaxBy(f => recientes.IndexOf(f.Id))!;
        }

        var especificidad = disponibles.Max(f => f.Especificidad);
        return ElegirPorPeso(disponibles.Where(f => f.Especificidad == especificidad).ToList(), azar);
    }

    private static Fragmento ElegirPorPeso(List<Fragmento> opciones, Random azar)
    {
        var punto = azar.Next(opciones.Sum(f => f.Peso));
        foreach (var opcion in opciones)
        {
            if (punto < opcion.Peso)
            {
                return opcion;
            }

            punto -= opcion.Peso;
        }

        return opciones[^1];
    }
}
