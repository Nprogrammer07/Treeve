using Treeve.Domain.Desahogos;
using Treeve.Domain.MensajesApoyo;

namespace Treeve.Domain.Services.MensajesApoyo;

/// <param name="FragmentosRecientes">Ids usados en las últimas respuestas de la persona, del más reciente al más antiguo.</param>
/// <param name="Semilla">El azar llega desde afuera: con la misma semilla, el mismo mensaje.</param>
public sealed record PeticionDeMensaje(
    string Apodo,
    Emocion Emocion,
    string Texto,
    IReadOnlyList<string> FragmentosRecientes,
    int Semilla)
{
    // Lleva el texto del desahogo: nunca se imprime.
    public override string ToString() => "[petición de mensaje de apoyo]";
}

/// <summary>
/// Arma el mensaje de apoyo de un desahogo (ADR-001). Hoy lo implementa <see cref="MotorDeRespuesta"/>;
/// un generador distinto (por ejemplo, con IA) sería otra implementación, sin tocar el dominio.
/// </summary>
public interface IGeneradorMensajeApoyo
{
    MensajeDeApoyo Generar(PeticionDeMensaje peticion);
}
