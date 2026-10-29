using Treeve.Domain.Comun;

namespace Treeve.Domain.EspacioVerde;

/// <summary>
/// HU-07a: cómo crece el lote. Cada desahogo es un riego. Cada <see cref="DesahogosPorCrecimiento"/> riegos crece un
/// solo componente, un nivel, por turnos (árbol, flores, bosque…); nunca todos a la vez. Un componente en su nivel
/// máximo cede el turno al siguiente. El estado no se guarda: se calcula a partir de los riegos, así que cambiar el
/// umbral (HU-07: "umbral configurable") no exige migrar datos.
/// </summary>
public sealed class ReglaDeCrecimiento
{
    public const int DesahogosPorDefecto = 3;
    public const int NivelInicial = 1;
    public const int NivelMaximo = 4;

    private static readonly ComponenteDelLote[] Turnos = Enum.GetValues<ComponenteDelLote>();

    public ReglaDeCrecimiento(int desahogosPorCrecimiento = DesahogosPorDefecto)
    {
        if (desahogosPorCrecimiento < 1)
        {
            throw new ExcepcionDeDominio("El umbral de crecimiento debe ser de al menos 1 desahogo.");
        }

        DesahogosPorCrecimiento = desahogosPorCrecimiento;
    }

    public int DesahogosPorCrecimiento { get; }

    /// <summary>Cuántos crecimientos caben en un lote: cada componente sube del nivel inicial al máximo.</summary>
    public static int CrecimientosPosibles => Turnos.Length * (NivelMaximo - NivelInicial);

    public EstadoDelLote Calcular(int riegos)
    {
        if (riegos < 0)
        {
            throw new ExcepcionDeDominio("Los riegos no pueden ser negativos.");
        }

        var niveles = Turnos.ToDictionary(c => c, _ => NivelInicial);
        var turno = 0;

        for (var crecimiento = 0; crecimiento < riegos / DesahogosPorCrecimiento; crecimiento++)
        {
            var siguiente = SiguienteConEspacio(niveles, turno);
            if (siguiente < 0)
            {
                break; // el lote está completo: los riegos siguen sumando, pero ya no hay qué hacer crecer
            }

            niveles[Turnos[siguiente]]++;
            turno = (siguiente + 1) % Turnos.Length;
        }

        var proximo = SiguienteConEspacio(niveles, turno);
        var completo = proximo < 0;

        return new EstadoDelLote(
            riegos,
            niveles,
            Nutricion: completo ? 0 : riegos % DesahogosPorCrecimiento,
            RiegosParaElSiguiente: completo ? 0 : DesahogosPorCrecimiento - (riegos % DesahogosPorCrecimiento),
            SiguienteEnCrecer: completo ? null : Turnos[proximo]);
    }

    /// <summary>
    /// Qué componente creció justo con el riego número <paramref name="numeroDeRiego"/>, o null si ese riego no hizo
    /// crecer nada. Es la señal de "hito del árbol" que usará el mensaje de apoyo (HU-06a-2).
    /// </summary>
    public ComponenteDelLote? CrecioConElRiego(int numeroDeRiego)
    {
        if (numeroDeRiego < 1)
        {
            return null;
        }

        var antes = Calcular(numeroDeRiego - 1);
        var despues = Calcular(numeroDeRiego);

        return Turnos.Cast<ComponenteDelLote?>().FirstOrDefault(c => despues.Nivel(c!.Value) > antes.Nivel(c.Value));
    }

    /// <summary>Índice del primer componente, desde <paramref name="desde"/>, que todavía puede crecer; -1 si ninguno.</summary>
    private static int SiguienteConEspacio(Dictionary<ComponenteDelLote, int> niveles, int desde)
    {
        for (var i = 0; i < Turnos.Length; i++)
        {
            var candidato = (desde + i) % Turnos.Length;
            if (niveles[Turnos[candidato]] < NivelMaximo)
            {
                return candidato;
            }
        }

        return -1;
    }
}
