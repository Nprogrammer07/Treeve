namespace Treeve.Infrastructure.Eventos;

/// <summary>
/// Recuerda qué manejador ya recibió qué evento, para que una entrega repetida no se procese dos veces (TEC-03).
/// Vive en memoria y guarda solo las últimas entregas: un reinicio lo olvida, así que cada manejador debe seguir
/// siendo idempotente por sí mismo.
/// </summary>
internal sealed class RegistroDeEventosProcesados
{
    private const int CapacidadPorDefecto = 10_000;

    private readonly int capacidad;
    private readonly HashSet<string> vistos = [];
    private readonly Queue<string> orden = new();
    private readonly object candado = new();

    public RegistroDeEventosProcesados()
        : this(CapacidadPorDefecto)
    {
    }

    public RegistroDeEventosProcesados(int capacidad)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(capacidad, 1);
        this.capacidad = capacidad;
    }

    /// <summary>Devuelve <c>true</c> si es la primera vez; <c>false</c> si ese manejador ya recibió ese evento.</summary>
    public bool Marcar(Guid eventoId, string tipoDeEvento, string manejador)
    {
        var clave = Clave(eventoId, tipoDeEvento, manejador);

        lock (candado)
        {
            if (!vistos.Add(clave))
            {
                return false;
            }

            orden.Enqueue(clave);
            if (orden.Count > capacidad)
            {
                vistos.Remove(orden.Dequeue());
            }

            return true;
        }
    }

    /// <summary>Para que un evento cuyo manejador falló o se canceló pueda reintentarse.</summary>
    public void Olvidar(Guid eventoId, string tipoDeEvento, string manejador)
    {
        var clave = Clave(eventoId, tipoDeEvento, manejador);

        lock (candado)
        {
            // La clave queda en la cola hasta que le toque salir; al volver a marcarse se encola de nuevo, y la
            // entrada vieja solo hace que la nueva salga un poco antes. No afecta a la corrección.
            vistos.Remove(clave);
        }
    }

    private static string Clave(Guid eventoId, string tipoDeEvento, string manejador) =>
        $"{eventoId:N}|{tipoDeEvento}|{manejador}";
}
